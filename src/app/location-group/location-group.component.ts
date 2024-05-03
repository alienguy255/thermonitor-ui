import {Component, EventEmitter, OnInit, OnChanges, Input} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Thermostat, Location, ThermostatUpdateEvent, WeatherUpdateEvent} from 'src/app/models/thermostat';

import * as Stomp from 'stompjs';
import * as SockJS from 'sockjs-client/dist/sockjs';

@Component({
  selector: 'location-group',
  templateUrl: './location-group.component.html',
  styleUrls: ['./location-group.component.css']
})
export class LocationGroupComponent implements OnInit, OnChanges {
    locationName = '';

    @Input() location: Location;

    onTstatUpdate: EventEmitter<ThermostatUpdateEvent> = new EventEmitter<ThermostatUpdateEvent>();
    onWeatherUpdate: EventEmitter<WeatherUpdateEvent> = new EventEmitter<WeatherUpdateEvent>();

    thermostats: Thermostat[] = [];

    private stompClient;

    constructor(private http: HttpClient) { }

    ngOnInit() {
        this.locationName = this.location.description;

        // TODO: subscribe to websocket topics by location
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

        // load all thermostats by location from server, render chart per tstat
        this.getApiResponse('http://localhost:8081/thermostats?locationId=' + this.location.id).then(
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