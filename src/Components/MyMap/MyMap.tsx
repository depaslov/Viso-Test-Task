import React, { useState, useCallback, useEffect } from "react";
import {
  GoogleMap,
  Marker,
  useJsApiLoader,
  MarkerClusterer,
} from "@react-google-maps/api";
import {
  collection,
  addDoc,
  Timestamp,
  doc,
  updateDoc,
  deleteDoc,
  getDocs,
} from "firebase/firestore";
import { db } from "../../firebase";

interface MarkerType {
  id: string;
  lat: number;
  lng: number;
  label: string;
  timestamp: number;
}

const MyMap: React.FC = () => {
  const { isLoaded } = useJsApiLoader({
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
  });

  const [markers, setMarkers] = useState<MarkerType[]>([]);
  const position = { lat: 49.8397, lng: 24.0297 };

  useEffect(() => {
    const fetchMarkers = async () => {
      const questsRef = collection(db, "quests");
      const snapshot = await getDocs(questsRef);
      const fetchedMarkers = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      })) as MarkerType[];
      setMarkers(fetchedMarkers);
    };

    fetchMarkers();
  }, []);

  const handleMapClick = useCallback(
    async (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const timestamp = Date.now();
        const newMarker: MarkerType = {
          id: "",
          lat: e.latLng.lat(),
          lng: e.latLng.lng(),
          label: (markers.length + 1).toString(),
          timestamp,
        };

        try {
          const questsRef = collection(db, "quests");
          const docRef = await addDoc(questsRef, {
            Location: `${newMarker.lat}, ${newMarker.lng}`,
            Timestamp: Timestamp.fromMillis(timestamp),
            Next: markers.length === 0 ? null : `Quest ${markers.length + 2}`,
          });
          newMarker.id = docRef.id;
          setMarkers((prevMarkers) => [...prevMarkers, newMarker]);
        } catch (error) {
          console.error("Error adding document: ", error);
        }
      }
    },
    [markers]
  );

  const deleteMarker = useCallback(
    async (id: string) => {
      try {
        const questRef = doc(db, "quests", id);
        await deleteDoc(questRef);
        setMarkers((prevMarkers) =>
          prevMarkers.filter((marker) => marker.id !== id)
        );

        const updatedMarkers = markers.filter((marker) => marker.id !== id);
        const index = markers.findIndex((marker) => marker.id === id);
        if (index > 0) {
          const prevMarker = updatedMarkers[index - 1];
          const prevQuestRef = doc(db, "quests", prevMarker.id);
          await updateDoc(prevQuestRef, {
            Next: index === updatedMarkers.length ? null : `Quest ${index + 2}`,
          });
        }
      } catch (error) {
        console.error("Error deleting quest: ", error);
      }
    },
    [markers]
  );

  const deleteAllMarkers = useCallback(async () => {
    try {
      const questsRef = collection(db, "quests");
      const snapshot = await getDocs(questsRef);
      snapshot.forEach((doc) => deleteDoc(doc.ref));
      setMarkers([]);
    } catch (error) {
      console.error("Error deleting all quests: ", error);
    }
  }, []);

  const handleMarkerDragEnd = useCallback(
    async (id: string, e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        try {
          const questRef = doc(db, "quests", id);
          await updateDoc(questRef, {
            Location: `${e.latLng.lat()}, ${e.latLng.lng()}`,
          });
          setMarkers((prevMarkers) =>
            prevMarkers.map((marker) =>
              marker.id === id
                ? { ...marker, lat: e.latLng!.lat(), lng: e.latLng!.lng() }
                : marker
            )
          );
        } catch (error) {
          console.error("Error updating quest location: ", error);
        }
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
                {markers.map((marker) => (
                  <Marker
                    key={marker.id}
                    position={{ lat: marker.lat, lng: marker.lng }}
                    label={marker.label}
                    onClick={() => deleteMarker(marker.id)}
                    draggable={true}
                    onDragEnd={(e) => handleMarkerDragEnd(marker.id, e)}
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
