import { Component, EventEmitter, OnInit, Input } from '@angular/core';
import * as Highcharts from 'highcharts/highstock';
import { HttpClient } from '@angular/common/http';
import {Thermostat, ThermostatUpdateEvent, WeatherUpdateEvent} from 'src/app/models/thermostat';
import {Point} from 'highcharts';

declare var require: any;
let Boost = require('highcharts/modules/boost');
let noData = require('highcharts/modules/no-data-to-display');
let More = require('highcharts/highcharts-more');


Boost(Highcharts);
noData(Highcharts);
More(Highcharts);
noData(Highcharts);

@Component({
  selector: 'app-output-graph',
  templateUrl: './output-graph.component.html',
  styleUrls: ['./output-graph.component.css']
})
export class OutputGraphComponent implements OnInit {

  private stockChart: Highcharts.Chart;

  @Input() private thermostat: Thermostat;
  @Input() private onTstatUpdate: EventEmitter<ThermostatUpdateEvent>;
  @Input() private onWeatherUpdate: EventEmitter<WeatherUpdateEvent>;

  public options: any = {
    chart: {
      type: 'line',
      height: 400
    },
    title: {
      text: 'current temp chart'
    },
    credits: {
      enabled: false
    },
    tooltip: {
      formatter() {
        return this.points.reduce((s, point: Point) => {
          return point.series.name !== 'Runtime' ? s + '<br/>' + point.series.name + ': ' + point.y.toFixed(1) + '°F'
              : s + '<br/>' + point.series.name + ': ' + point.y.toFixed(0) + 'm';
          // TODO: figure out how to use non-utc time instead of subtracting 5 hours
        }, '<b>' + Highcharts.dateFormat('%e %b %y %H:%M:%S', this.x - (60 * 60 * 1000 * 5)) + '</b>');
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
      selected: 1
    },
    yAxis: [{
      title: {
        text: 'Temperature (°F)'
      },
      height: '60%'
    }, {
      title: {
        text: 'Runtime'
      },
      top: '65%',
      height: '35%'
    }],
    time: {
      useUTC: false,
      timezoneOffset: 5 * 60
    },
    series: [
      {
        name: 'Temperature',
        data: [],
        pointInterval: 60 * 1000,
        zIndex: 2,
        tooltip: {
          valueDecimals: 1,
          valueSuffix: '°F'
        }
      },
      {
        name: 'Target Temperature',
        data: [],
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
        data: [],
        pointInterval: 60 * 1000,
        zIndex: 0,
        tooltip: {
          valueDecimals: 1,
          valueSuffix: '°F'
        },
      },
      {
        name: 'Runtime',
        data: [],
        type: 'column',
        yAxis: 1
      }
    ]
  };

  constructor(private http: HttpClient) { }

  ngOnInit() {
    this.onTstatUpdate.subscribe(tstatUpdateEvent => {
      if (this.thermostat.id === tstatUpdateEvent.thermostatId) {
        console.log('Received tstat update, update for thermostatId=' + tstatUpdateEvent.thermostatId);

        this.stockChart.series[0].addPoint([tstatUpdateEvent.time, tstatUpdateEvent.currentTemp], true, true);
        this.stockChart.series[1].addPoint([tstatUpdateEvent.time, tstatUpdateEvent.targetTemp], true, true);

        this.stockChart.series[3].addPoint([tstatUpdateEvent.time, tstatUpdateEvent.tstate], true, true);

        // change status in chart title depending on if the event indicates running or not (tstate of 1 is running, 0 is idle)
        if (tstatUpdateEvent.tstate === 1) {
          this.stockChart.setTitle({text: this.thermostat.name + ' (Running)'});
        } else {
          this.stockChart.setTitle({text: this.thermostat.name + ' (Idle)'});
        }
      }
    });

    this.onWeatherUpdate.subscribe(weatherUpdateEvent => {
      console.log('Received weather update for time=' + weatherUpdateEvent.time + ', currentTemp=' + weatherUpdateEvent.currentTemp);
      this.stockChart.series[2].addPoint([weatherUpdateEvent.time, weatherUpdateEvent.currentTemp], true, true);
    });

    const fromTime = new Date();
    fromTime.setDate(fromTime.getDate() - 7);
    const toTime = new Date();

    // TODO: find better way rather than loading weather data for every tstat
    this.getApiResponse('http://localhost:8081/thermostats/' + this.thermostat.id + '/samples?fromTime=' + fromTime.getTime() + '&toTime=' + toTime.getTime()).then(
      samples => {
        this.getApiResponse('http://localhost:8081/weather/' + this.thermostat.location.id + '/samples?fromTime=' + fromTime.getTime() + '&toTime=' + toTime.getTime()).then(
            weatherSamples => {
              this.renderChart(samples, weatherSamples, this.thermostat);
            },
            error => {
              console.log('An error occurred retrieving weather data from the server. ' + error);
            }
        );
      },
      error => {
        console.log('An error occurred retrieving thermostat data from the server. ' + error);
      });
  }

  getApiResponse(url) {
    return this.http.get<any>(url, {})
      .toPromise().then(res => {
        return res;
      });
  }

  renderChart(data, weatherSamples, tstat) {
    const currentTempData = [];
    const targetTempData = [];
    const runtimeData = [];
    for(var i = 0; i < data.length; i++){
      const currentTempVal = [];
      currentTempVal[0] = data[i].time;
      currentTempVal[1] = data[i].currentTemp;
      currentTempData[i] = currentTempVal;

      const targetTempVal = [];
      targetTempVal[0] = data[i].time;
      targetTempVal[1] = data[i].targetTemp;
      targetTempData[i] = targetTempVal;

      const tstateVal = [];
      tstateVal[0] = data[i].time;
      tstateVal[1] = data[i].tstate;
      runtimeData[i] = tstateVal;
    }
    this.options.series[0].data = currentTempData;
    this.options.series[1].data = targetTempData;

    // load weather data into chart:
    const outsideTempSeries = [];
    for(var i = 0; i < weatherSamples.length; i++) {
      const outsideTempVal = [];
      outsideTempVal[0] = weatherSamples[i].time;
      outsideTempVal[1] = weatherSamples[i].currentTemp;
      outsideTempSeries[i] = outsideTempVal;
    }
    this.options.series[2].data = outsideTempSeries;
    this.options.series[3].data = runtimeData;

    // TODO: seems like server is always returning null for last runtime data point in array
    this.options.title.text = runtimeData[runtimeData.length - 1][1] === 1 ? tstat.name + ' (Running)' : tstat.name + ' (Idle)';
    this.stockChart = Highcharts.stockChart('container' + tstat.id, this.options);
  }

}
