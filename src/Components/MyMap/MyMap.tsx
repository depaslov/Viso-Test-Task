import { useState, useCallback } from "react";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
  MarkerClusterer,
} from "@react-google-maps/api";

interface MarkerType {
  lat: number;
  lng: number;
  label: string;
}

const MyMap = () => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const [markers, setMarkers] = useState<MarkerType[]>([]);
  const position = { lat: 49.8397, lng: 24.0297 };

  const handleMapClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newMarker: MarkerType = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
          label: (markers.length + 1).toString(),
        };
        setMarkers((prevMarkers) => [...prevMarkers, newMarker]);
      }
    },
    [markers]
  );

  const deleteMarker = useCallback((index: number) => {
    setMarkers((prevMarkers) => prevMarkers.filter((_, i) => i !== index));
  }, []);

  const deleteAllMarkers = useCallback(() => {
    setMarkers([]);
  }, []);

  const handleMarkerDragEnd = useCallback(
    (index: number, e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        setMarkers((prevMarkers) =>
          prevMarkers.map((marker, i) =>
            i === index
              ? { ...marker, lat: e.latLng!.lat(), lng: e.latLng!.lng() }
              : marker
          )
        );
      }
    },
    []
  );

  if (!isLoaded) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      <h1>React Google Map</h1>
      <button onClick={deleteAllMarkers}>Delete All Markers</button>
      <div style={{ height: "80vh", width: "100%" }}>
        <GoogleMap
          zoom={12}
          center={position}
          onClick={handleMapClick}
          mapContainerStyle={{ width: "100%", height: "100%" }}
        >
          <MarkerClusterer>
            {(clusterer) => (
              <>
                {markers.map((marker, index) => (
                  <Marker
                    key={index}
                    position={{ lat: marker.lat, lng: marker.lng }}
                    label={marker.label}
                    onClick={() => deleteMarker(index)}
                    draggable={true}
                    onDragEnd={(e) => handleMarkerDragEnd(index, e)}
                    clusterer={clusterer}
                  />
                ))}
              </>
            )}
          </MarkerClusterer>
        </GoogleMap>
      </div>
    </div>
  );
};

export default MyMap;
