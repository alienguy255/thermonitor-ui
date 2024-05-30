import { Thermostat } from "./thermostat";
import { WeatherSample } from "./samples";

export interface Location {
  id: string;
  description: string;
  longitude: string;
  latitude: string;
  thermostats: Thermostat[];
  weatherSamples: WeatherSample[];
}