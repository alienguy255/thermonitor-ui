import {Component, EventEmitter, OnInit, OnChanges} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Thermostat, ThermostatUpdateEvent, WeatherUpdateEvent} from 'src/app/models/thermostat';

import * as Stomp from 'stompjs';
import * as SockJS from 'sockjs-client';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnChanges {
  title = 'Thermostat Dashboard';

  private onTstatUpdate: EventEmitter<ThermostatUpdateEvent> = new EventEmitter<ThermostatUpdateEvent>();
  private onWeatherUpdate: EventEmitter<WeatherUpdateEvent> = new EventEmitter<WeatherUpdateEvent>();

  private stompClient;

  thermostats: Thermostat[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit() {
    const ws = new SockJS('http://localhost:8081/websocket');
    this.stompClient = Stomp.over(ws);
    const that = this;

    this.stompClient.connect({}, () => {
      // subscribe to tstat updates:
      that.stompClient.subscribe('/topic/tstat-updates', (update) => {
        const updateBody = JSON.parse(update.body);

        const tstatUpdateEvent: ThermostatUpdateEvent = {
          thermostatId: updateBody.thermostatId,
          tstate: updateBody.tstate,
          currentTemp: updateBody.currentTemp,
          targetTemp: updateBody.targetTemp,
          time: updateBody.time
        };

        that.onTstatUpdate.emit(tstatUpdateEvent);
      });

      // subscribe to current outdoor temp updates:
      that.stompClient.subscribe('/topic/weather-updates', (update) => {
        console.log('received weather update: ' + update);
        const updateBody = JSON.parse(update.body);

        const weatherUpdateEvent: WeatherUpdateEvent = {
          currentTemp: updateBody.currentTemp,
          time: updateBody.time
        };

        that.onWeatherUpdate.emit(weatherUpdateEvent);
      });
    });

    // load all thermostats from server, render chart per tstat
    this.getApiResponse('http://localhost:8081/thermostats').then(
      tstats => {
        this.thermostats = tstats;
      },
      error => {
        console.log('An error occurred retrieving thermostat data from the server. ' + error);
      });
  }

  ngOnChanges() {
    console.log('change detected!');
  }

  isDataAvailable() {
    return this.thermostats.length > 0;
  }

  getApiResponse(url) {
    return this.http.get<any>(url, {})
      .toPromise().then(res => {
        return res;
      });
  }

}


