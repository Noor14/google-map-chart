import { Component, OnInit, ViewChild, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  GoogleMap,
  GoogleMapsModule,
  MapMarker,
  MapPolyline,
} from '@angular/google-maps';
import { HttpClient } from '@angular/common/http';
import { tap } from 'rxjs';
import { NgxChartsModule } from '@swimlane/ngx-charts';
import { NgbDropdownModule } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, NgbDropdownModule, GoogleMapsModule, NgxChartsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
})
export class AppComponent implements OnInit {
  @ViewChild(GoogleMap) map: GoogleMap;
  @ViewChild(MapMarker) Marker: MapMarker;
  @ViewChild(MapPolyline) polyline: MapPolyline;

  public selectedRoute = 'Select Route';
  public vesselInfo: any = {};
  public mapOptions: google.maps.MapOptions = {
    zoom: 14,
    zoomControl: false,
    mapTypeControl: false,
    streetViewControl: false,
    fullscreenControl: false,
  };

  public markerOptions = {
    icon: {
      path: google.maps.SymbolPath.CIRCLE,
      fillColor: 'orange',
      fillOpacity: 1,
      strokeColor: 'orange',
      strokeWeight: 2,
      scale: 5, // Adjust the scale as needed
    },
  };

  public polylineOptions = {
    geodesic: true,
    strokeOpacity: 1.0,
    strokeWeight: 2,
    strokeColor: '#FF0000',
    icons: [
      {
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          fillOpacity: 1,
          strokeOpacity: 1,
          strokeWeight: 1,
          fillColor: '#FF0000',
          strokeColor: '#FF0000',
          scale: 3,
        },
        offset: '0',
        repeat: '20px',
      },
    ],
  };
  public polylineCoordinates: any = [];

  public view: [number, number] = [900, 300];
  public xAxisLabel: string = 'Time in Hour';
  public yAxisLabel: string = 'Speed in per Hour';
  public graphData: any[] = [];
  private readonly _http = inject(HttpClient);

  ngOnInit(): void {
    // load vessel json
    this._http
      .get('/assets/vessel.json')
      .pipe(
        // covert leg_duration millisecond into hours
        tap((data: any) => {
          Object.keys(data).forEach((item: string) => {
            data[item].leg_duration =
              data[item].leg_duration / (60 * 60 * 1000);
            data[item].points = data[item].points.map(
              ([lng, lat, time, speed]: number[]) => ({
                lng,
                lat,
                time: time / (60 * 60 * 1000), // convert millisecond into hr
                speed: speed * 1.852, // 1knot is equal to 1.852/hr,
              })
            );
          });

          console.log(data);
          this.vesselInfo = data;
        })
      )
      .subscribe();
  }

  routeChange(key: number) {
    this.vesselPath(key);
  }

  vesselPath(routeId: number) {
    this.polylineCoordinates = this.vesselInfo[routeId].points;
    const avgSpeed =
      this.polylineCoordinates.reduce(
        (acc: number, curr: any) => acc + curr.speed,
        0
      ) / this.polylineCoordinates.length;

    const series = this.polylineCoordinates.map((obj: any) => ({
      name: obj.time,
      value: obj.speed,
    }));
    this.graphData = [
      {
        name: `Form ${this.vesselInfo[routeId].from_port} Port to ${this.vesselInfo[routeId].to_port} Port`,
        series,
      },
    ];
    const polylineBounds = this.getPolylineBounds(this.polylineCoordinates);
    this.map.fitBounds(polylineBounds);
  }

  getPolylineBounds(polylineCoordinates: any[]) {
    let minLat = Number.MAX_VALUE;
    let minLng = Number.MAX_VALUE;
    let maxLat = Number.MIN_VALUE;
    let maxLng = Number.MIN_VALUE;

    for (const coord of polylineCoordinates) {
      minLat = Math.min(minLat, coord.lat);
      minLng = Math.min(minLng, coord.lng);
      maxLat = Math.max(maxLat, coord.lat);
      maxLng = Math.max(maxLng, coord.lng);
    }

    return { south: minLat, west: minLng, north: maxLat, east: maxLng };
  }
}
