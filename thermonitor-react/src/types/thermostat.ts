import { ThermostatSample } from "./samples";
import { Location } from "./location";

export interface Thermostat {
  id: string;
  location: Location;
  name: string;
  url: string;
  samples: ThermostatSample[];
}