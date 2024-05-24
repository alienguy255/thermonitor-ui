import Highcharts, {AxisSetExtremesEventObject, Chart} from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import styles from "./ThermostatChart.module.css";
import { useState } from 'react';
import { Thermostat } from '@/types/thermostat';
import { WeatherSample } from '@/types/samples';
import { IMessage, useSubscription } from 'react-stomp-hooks';

export default function ThermostatChart({
  thermostat,
  weatherSamples
}: {
  thermostat: Thermostat;
  weatherSamples: WeatherSample[];
}) {

  const [chart, setChart] = useState<Highcharts.StockChart>();
  const [currentIndoorTemp, setCurrentIndoorTemp] = useState<number>(Math.round(thermostat.samples[thermostat.samples.length - 1].currentTemp * 10) / 10);
  const [currentTargetTemp, setCurrentTargetTemp] = useState<number>(Math.round(thermostat.samples[thermostat.samples.length - 1].targetTemp * 10) / 10);
  const [runtimeMins, setRuntimeMins] = useState<number>(
    thermostat.samples
      .filter(s => s.tstate === 1)
      .reduce((sum, s) => sum + s.tstate, 0)
  );

  useSubscription('/topic/tstat-updates', (message: IMessage) => {
    let tstatUpdateEvent: any = JSON.parse(message.body);
    if (tstatUpdateEvent.thermostatId === thermostat.id) {
      // change status in chart title depending on if the event indicates running or not (tstate of 1 is running, 0 is idle)
      chart?.setTitle({text: thermostat.name + (tstatUpdateEvent.sample.tstate === 1 ? ' (Running)' : ' (Idle)')});

      // add current temp to chart and update current temp in info column:
      chart?.series[0].addPoint([tstatUpdateEvent.sample.timeMs, tstatUpdateEvent.sample.currentTemp], true, true);
      setCurrentIndoorTemp(tstatUpdateEvent.sample.currentTemp);

      chart?.series[1].addPoint([tstatUpdateEvent.sample.timeMs, tstatUpdateEvent.sample.targetTemp], true, true);
      setCurrentTargetTemp(tstatUpdateEvent.sample.targetTemp);

      chart?.series[3].addPoint([tstatUpdateEvent.sample.timeMs, tstatUpdateEvent.sample.tstate], true, true);
      setRuntimeMins(runtimeMins + tstatUpdateEvent.sample.tstate);
    }
  });

  useSubscription('/topic/weather-updates', (message: IMessage) => {
    let weatherUpdateEvent: any = JSON.parse(message.body);
    console.log('received weather update event, time=' + weatherUpdateEvent.time + ', currentTemp=' + weatherUpdateEvent.currentTemp);
    chart?.series[2].addPoint([weatherUpdateEvent.time, weatherUpdateEvent.currentTemp], true, true);
  });
  
  let currentTempData: number[][] = [];
  let targetTempData: number[][] = [];
  let runtimeData: number[][] = [];

  thermostat.samples
    .forEach(sample => {
      currentTempData.push([sample.timeMs, sample.currentTemp]);
      targetTempData.push([sample.timeMs, sample.targetTemp]);
      runtimeData.push([sample.timeMs, sample.tstate]);
    });

  let outsideTempSeries: number[][] = [];
  weatherSamples.forEach(sample => {
    outsideTempSeries.push([sample.timeMs, sample.currentTemp]);
  });

  const options = {
    chart: {
          type: 'line',
          height: 400,
          styledMode: true,
          spacing: [15, 15, 15, 15]
        },
        title: {
          text: thermostat.name + (thermostat.samples[thermostat.samples.length - 1].tstate === 1 ? ' (Running)' : ' (Idle)')
        },
        credits: {
          enabled: false
        },
        tooltip: {
          formatter(this: Highcharts.TooltipFormatterContextObject): string {
            if (!this.points) {
              return '';
            }
            return this.points.reduce((s: string, point) => {
              const pointY = point.y as number; // Ensure point.y is treated as a number
              const pointSeriesName = point.series.name;
      
              if (pointSeriesName !== 'Runtime') {
                return s + '<br/>' + pointSeriesName + ': ' + pointY.toFixed(1) + '°F';
              } else {
                return s + '<br/>' + pointSeriesName + ': ' + pointY.toFixed(0) + 'm';
              }
            }, '<b>' + Highcharts.dateFormat('%e %b %y %H:%M:%S', (this.x as number) - (60 * 60 * 1000 * 4)) + '</b>');
          }
        },
        // TODO: figure out how to select and drag with cursor like original version does....onSetExtreemes() maybe?
        rangeSelector: {
          inputEnabled: true,
          buttons: [{
            type: 'hour',
            count: 3,
            text: '3h'
          }, {
            type: 'day',
            count: 1,
            text: '1d'
          }, {
            type: 'all',
            text: 'All'
          }
          ],
          selected: 2
        },
        xAxis: {
          events: {
            afterSetExtremes: (e: Highcharts.AxisSetExtremesEventObject) => {
              Highcharts.each(Highcharts.charts, function(c: Highcharts.StockChart) {
                if (c !== undefined && c !== chart) {
                  c.xAxis[0].setExtremes(e.min, e.max);
                }
              })
            }
          }
        },
        yAxis: [
          {
            title: {
              text: 'Temperature (°F)'
            },
            height: '60%'
          }, {
            title: {
              text: 'Runtime'
            },
            top: '65%',
            height: '35%',
            left: '-1.5%'
          }
        ],
        time: {
          useUTC: false,
          timezoneOffset: 4 * 60
        },
        series: [
          {
            name: 'Temperature',
            data: currentTempData,
            pointInterval: 60 * 1000,
            zIndex: 2,
            tooltip: {
              valueDecimals: 1,
              valueSuffix: '°F'
            }
          },
          {
            name: 'Target Temperature',
            data: targetTempData,
            pointInterval: 60 * 1000,
            dashStyle: 'ShortDash',
            zIndex: 1,
            tooltip: {
              valueDecimals: 1,
              valueSuffix: '°F'
            }
          },
          {
            name: 'Outside Temperature',
            data: outsideTempSeries,
            pointInterval: 60 * 1000,
            zIndex: 0,
            tooltip: {
              valueDecimals: 1,
              valueSuffix: '°F'
            },
          },
          {
            name: 'Runtime',
            data: runtimeData,
            type: 'column',
            yAxis: 1
          }
        ]
  };

  return (
    <div className={styles.row}>
      
        <HighchartsReact
          highcharts={Highcharts}
          constructorType={'stockChart'}
          options={options}
          callback={(chart: Chart) => setChart(chart)}
          containerProps={{ style: {flexGrow: 1} }}
        />
      
      <div className={styles.tstatinfo}>
        <div>
          <h3 className={styles.first}>{currentIndoorTemp}°F</h3>
          <p>Current Indoor Temp</p>
        </div>
        <div>
          <h3>{currentTargetTemp}°F</h3>
          <p>Current Target Temp</p>
        </div>
        <div>
          <h3>{runtimeMins}</h3>
          <p>Runtime Mins</p>
        </div>
      </div>
    </div>
  );
}