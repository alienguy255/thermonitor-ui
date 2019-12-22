import { Component, EventEmitter, OnInit, Input } from '@angular/core';
import * as Highcharts from 'highcharts/highstock';
import { HttpClient } from '@angular/common/http';
import {Thermostat, ThermostatUpdateEvent, WeatherUpdateEvent} from 'src/app/models/thermostat';

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

  @Input() thermostat: Thermostat;

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
      formatter: function() {
        return '<b>x: </b>' + Highcharts.dateFormat('%e %b %y %H:%M:%S', this.x) +
          ' <br> <b>y: </b>' + this.y.toFixed(2);
      }
    },
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
        name: 'Runtime',
        data: [],
        type: 'column',
        yAxis: 1
      }
    ]
  };

  constructor(private http: HttpClient) { }

  ngOnInit(){
    this.onTstatUpdate.subscribe(tstatUpdateEvent => {
      if (this.thermostat.id === tstatUpdateEvent.thermostatId) {
        console.log("Received tstat update, update for thermostatId=" + tstatUpdateEvent.thermostatId);

        this.stockChart.series[0].addPoint([tstatUpdateEvent.time, tstatUpdateEvent.currentTemp], true, true);
        this.stockChart.series[1].addPoint([tstatUpdateEvent.time, tstatUpdateEvent.targetTemp], true, true);
        this.stockChart.series[3].addPoint([tstatUpdateEvent.time, tstatUpdateEvent.tstate], true, true);
      }
    });

    this.onWeatherUpdate.subscribe(weatherUpdateEvent => {
      console.log("Received weather update for time=" + weatherUpdateEvent.time + ", currentTemp=" + weatherUpdateEvent.currentTemp);
      this.stockChart.series[2].addPoint([weatherUpdateEvent.time, weatherUpdateEvent.currentTemp], true, true);
    });

    var fromTime = new Date();
    fromTime.setDate(fromTime.getDate() - 7);
    var toTime = new Date();

    // TODO: load outdoor temp data into chart
    this.getApiResponse('http://localhost:8081/thermostats/' + this.thermostat.id + '/samples?fromTime=' + fromTime.getTime() + '&toTime=' + toTime.getTime()).then(
      samples => {
        this.renderChart(samples, this.thermostat);
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

  renderChart(data, tstat) {
    const current_temp_data = [];
    const target_temp_data = [];
    const runtime_data = [];
    for(var i=0;i < data.length;i++){
      var currentTempVal = new Array();
      currentTempVal[0] = data[i].time;
      currentTempVal[1] = data[i].currentTemp;
      current_temp_data[i] = currentTempVal;

      var targetTempVal = new Array();
      targetTempVal[0] = data[i].time;
      targetTempVal[1] = data[i].targetTemp;
      target_temp_data[i] = targetTempVal;

      var tstateVal = new Array();
      tstateVal[0] = data[i].time;
      tstateVal[1] = data[i].tstate;
      runtime_data[i] = tstateVal;
    }
    this.options.series[0]['data'] = current_temp_data;
    this.options.series[1]['data'] = target_temp_data;
    this.options.series[2]['data'] = runtime_data;
    this.options.title.text = tstat.name;
    this.stockChart = Highcharts.stockChart('container' + tstat.id, this.options);
  }

}
