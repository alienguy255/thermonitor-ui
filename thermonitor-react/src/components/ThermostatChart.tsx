import Highcharts, {AxisSetExtremesEventObject, Chart} from 'highcharts/highstock';
import HighchartsReact from 'highcharts-react-official';
import styles from "./ThermostatChart.module.css";
import { useImperativeHandle, useState, forwardRef, useRef, Ref, ForwardRefRenderFunction } from 'react';
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
  const childRef = useRef<ThermostatInfoActions>();

  useSubscription('/topic/tstat-updates', (message: IMessage) => {
    let tstatUpdateEvent: any = JSON.parse(message.body);
    if (tstatUpdateEvent.thermostatId === thermostat.id) {
      let tstate = tstatUpdateEvent.sample.tstate;

      // change status in chart title depending on if the event indicates running or not (tstate of 1 is running, 0 is idle)
      chart?.setTitle({text: thermostat.name + (tstate === 1 ? ' (Running)' : ' (Idle)')});

      // add current temp to chart and update current temp in info column:
      chart?.series[0].addPoint([tstatUpdateEvent.sample.timeMs, tstatUpdateEvent.sample.currentTemp], true, true);
      childRef?.current?.updateIndoorTemp(tstatUpdateEvent.sample.currentTemp);

      chart?.series[1].addPoint([tstatUpdateEvent.sample.timeMs, tstatUpdateEvent.sample.targetTemp], true, true);
      childRef?.current?.updateTargetTemp(tstatUpdateEvent.sample.targetTemp);

      chart?.series[3].addPoint([tstatUpdateEvent.sample.timeMs, tstate], true, true);
      childRef?.current?.updateRuntimeMins(tstate);

      childRef?.current?.updateLastCollectionTime(new Date(tstatUpdateEvent.sample.timeMs));
    }
  });

  useSubscription('/topic/weather-updates', (message: IMessage) => {
    let weatherUpdateEvent: any = JSON.parse(message.body);
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
              Highcharts.charts.forEach((c)=> {
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
          containerProps={{ style: {flexGrow: 1, margin: 10} }}
      />
      <ThermostatInfoComponent
          ref={childRef} 
          indoorTemp={Math.round(thermostat.samples[thermostat.samples.length - 1].currentTemp * 10) / 10}
          targetTemp={Math.round(thermostat.samples[thermostat.samples.length - 1].targetTemp * 10) / 10}
          runtimeMins={thermostat.samples.filter(s => s.tstate === 1).reduce((sum, s) => sum + s.tstate, 0)}
          lastCollectionTime={new Date(thermostat.samples[thermostat.samples.length - 1].timeMs)}
      />
    </div>
  );
}

interface ThermostatInfoActions {
  updateIndoorTemp: (indoorTemp: number) => void;
  updateTargetTemp: (targetTemp: number) => void;
  updateRuntimeMins: (runtimeMins: number) => void;
  updateLastCollectionTime: (lastCollectionTime: Date) => void;
}

const ThermostatInfo: ForwardRefRenderFunction<ThermostatInfoActions, {indoorTemp: number, targetTemp: number, runtimeMins: number, lastCollectionTime: Date}> = (props: {indoorTemp: number, targetTemp: number, runtimeMins: number, lastCollectionTime: Date}, ref: Ref<ThermostatInfoActions>) => {

  const [indoorTemp, setIndoorTemp] = useState<number>(props.indoorTemp);
  const [targetTemp, setTargetTemp] = useState<number>(props.targetTemp);
  const [runtimeMins, setRuntimeMins] = useState<number>(props.runtimeMins);
  const [lastCollectionTime, setLastCollectionTime] = useState<Date>(props.lastCollectionTime);

  // TODO: this is apparently not good practice, find a better way to update the values in the info side display without re-rendering the charts
  useImperativeHandle(ref, () => ({
    updateIndoorTemp: (updatedIndoorTemp: number) => {
      setIndoorTemp(updatedIndoorTemp);
    },
    updateTargetTemp: (updatedTargetTemp: number) => {
      setTargetTemp(updatedTargetTemp);
    },
    updateRuntimeMins: (updatedRuntimeMins: number) => {
      setRuntimeMins(runtimeMins + updatedRuntimeMins);
    },
    updateLastCollectionTime: (lastCollectionTime: Date) => {
      setLastCollectionTime(lastCollectionTime);
    }
  }));

  return (
    <div className={styles.tstatinfo}>
    <div>
      <h3 className={styles.first}>{indoorTemp}°F</h3>
      <p>Current Indoor Temp</p>
    </div>
    <div>
      <h3>{targetTemp}°F</h3>
      <p>Current Target Temp</p>
    </div>
    <div>
      <h3>{runtimeMins}</h3>
      <p>Runtime Mins</p>
    </div>
    <div className={styles.last}>
      <p>(Data received at {lastCollectionTime.toLocaleTimeString()})</p>
    </div>
  </div>
  );
};

const ThermostatInfoComponent = forwardRef(ThermostatInfo);