import {Component, OnInit, OnChanges} from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Location} from 'src/app/models/thermostat';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit, OnChanges {

  locations: Location[] = [];

  constructor(private http: HttpClient) { }

  ngOnInit() {
    // load all locations from server, render group per location
    this.getApiResponse('http://localhost:8081/locations').then(
      locationList => {
        this.locations = locationList;
      },
      error => {
        console.log('An error occurred retrieving location data from the server. ' + error);
      });
  }

  ngOnChanges() {
    console.log('change detected!');
  }

  isDataAvailable() {
    return this.locations.length > 0;
  }

  getApiResponse(url) {
    return this.http.get<any>(url, {})
      .toPromise().then(res => {
        return res;
      });
  }

}


