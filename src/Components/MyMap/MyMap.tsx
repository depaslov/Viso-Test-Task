import { useState, useCallback } from "react";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
  MarkerClusterer,
} from "@react-google-maps/api";
import { collection, addDoc, Timestamp, doc, updateDoc, deleteField, deleteDoc } from "firebase/firestore";
import { db } from "../../firebase";

interface MarkerType {
  lat: number;
  lng: number;
  label: string;
  timestamp: number;
}

const MyMap = () => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const [markers, setMarkers] = useState<MarkerType[]>([]);
  const position = { lat: 49.8397, lng: 24.0297 };

  const handleMapClick = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const newMarker: MarkerType = {
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
          label: (markers.length + 1).toString(),
          timestamp: Date.now(),
        };
        setMarkers((prevMarkers) => [...prevMarkers, newMarker]);

        try {
          const questsRef = collection(db, "quests");
          await addDoc(questsRef, {
            [`Quest ${newMarker.label}`]: {
              Location: `${newMarker.lat}, ${newMarker.lng}`,
              Timestamp: Timestamp.fromMillis(newMarker.timestamp),
              Next: newMarker.label === markers.length.toString() ? null : `Quest ${parseInt(newMarker.label) + 1}`,
            },
          });
        } catch (error) {
          console.error("Error adding document: ", error);
        }
      }
    },
    [markers]
  );

  const deleteMarker = useCallback(async (index: number) => {
    setMarkers((prevMarkers) => {
      const updatedMarkers = prevMarkers.filter((_, i) => i !== index);
      
      const questsRef = doc(db, "quests");
      updateDoc(questsRef, {
        [`Quest ${index + 1}`]: deleteField(),
      }).catch((error) => console.error("Error deleting quest: ", error));

      if (index > 0) {
        updateDoc(questsRef, {
          [`Quest ${index}`]: {
            Next: index === prevMarkers.length - 1 ? null : `Quest ${index + 2}`,
          },
        }).catch((error) => console.error("Error updating previous quest: ", error));
      }

      return updatedMarkers;
    });
  }, []);

  const deleteAllMarkers = useCallback(async () => {
    setMarkers([]);
    
    try {
      await deleteDoc(doc(db, "quests"));
    } catch (error) {
      console.error("Error deleting all quests: ", error);
    }
  }, []);

  const handleMarkerDragEnd = useCallback(
    async (index: number, e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        setMarkers((prevMarkers) => {
          const updatedMarkers = prevMarkers.map((marker, i) =>
            i === index
              ? { ...marker, lat: e.latLng!.lat(), lng: e.latLng!.lng() }
              : marker
          );

          const questsRef = doc(db, "quests");
          updateDoc(questsRef, {
            [`Quest ${index + 1}.Location`]: `${e.latLng!.lat()}, ${e.latLng!.lng()}`,
          }).catch((error) => console.error("Error updating quest location: ", error));

          return updatedMarkers;
        });
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