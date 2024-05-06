import { Component, EventEmitter, OnInit, OnChanges } from '@angular/core';
import { Apollo, gql } from 'apollo-angular';
import { Location, ThermostatUpdateEvent, WeatherUpdateEvent } from 'src/app/models/thermostat';

import * as Stomp from 'stompjs';
import * as SockJS from 'sockjs-client/dist/sockjs';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnChanges {

  locations: Location[] = [];

  onTstatUpdate: EventEmitter<ThermostatUpdateEvent> = new EventEmitter<ThermostatUpdateEvent>();
  onWeatherUpdate: EventEmitter<WeatherUpdateEvent> = new EventEmitter<WeatherUpdateEvent>();

  loading: boolean = true;

  private stompClient;

  constructor(private readonly apollo: Apollo) {}

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
            const updateBody = JSON.parse(update.body);

            const weatherUpdateEvent: WeatherUpdateEvent = {
                currentTemp: updateBody.currentTemp,
                time: updateBody.time
            };

            that.onWeatherUpdate.emit(weatherUpdateEvent);
        });
    });

    const fromTime = new Date();
    fromTime.setDate(fromTime.getDate() - 7);
    const toTime = new Date();

    this.apollo
        .watchQuery({
            query: gql`
                query locationDetails($fromTimeMs: String, $toTimeMs: String) {
                  locations {
                    id
                    description
                    weatherSamples(fromTimeMs: $fromTimeMs, toTimeMs: $toTimeMs) {
                        currentTemp
                        timeMs
                    }
                  	thermostats {
                    	id
                    	name
                    	samples(fromTimeMs: $fromTimeMs, toTimeMs: $toTimeMs) {
                      	    currentTemp
                      	    override
                      	    targetTemp
                      	    tstate
                      	    timeMs
                    	}
                  	}
                  }
                }
            `,
            variables: { fromTimeMs: fromTime.getTime(), toTimeMs: toTime.getTime() },
        })
        .valueChanges.subscribe((result: any) => {
            console.log('setting location data in app.component');
            this.locations = result.data?.locations;
            this.loading = false;
        })
  }

  ngOnChanges() {
    console.log('change detected in app component');
  }

  isDataAvailable() {
    return this.locations.length > 0;
  }

}


