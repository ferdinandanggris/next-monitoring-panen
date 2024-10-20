'use client';
import React, { useEffect, useState } from 'react';
import * as turf from '@turf/turf';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { database } from '@/app/lib/firebase';
import { onValue, ref } from 'firebase/database';
import { json } from 'stream/consumers';

interface ChildComponentProps {
  width?: string;
  height?: string;
}

// Mengatur ikon marker secara manual
const DefaultIcon = L.icon({
  iconUrl: '/icons/marker.png',
  iconSize: [15, 25],       // Ukuran ikon lebih kecil
  iconAnchor: [7, 25],      // Anchor disesuaikan dengan ukuran ikon
  popupAnchor: [1, -20],    // Popup juga disesuaikan dengan ukuran
  shadowSize: [25, 25],     // Shadow disesuaikan proporsional
});

const MapComponent: React.FC<ChildComponentProps> = ({width = '100%', height = '500px'}) => {
  const [points, setPoints] = useState([]);
  useEffect(() => {
        // Referensi ke data latitude dan longitude titik yang sudah dibajak
        const dbRef = ref(database, 'maps-point');
    
        // Listener untuk mengambil data secara real-time
        const unsubscribe = onValue(dbRef, (snapshot) => {
          const data = snapshot.val();
          if (data) {
            const pointsArray = Object.keys(data).map(key => ({
              id: key,
              latitude: data[key].lat,
              longitude: data[key].long
            }));
            console.log('data :' + JSON.stringify(pointsArray));
            setPoints(pointsArray);

            // remove point
            removePoint();
            
            pointsArray.forEach((point) => {
              PointToMap(point.latitude, point.longitude);
              console.log('point :' + point.latitude + ' ' + point.longitude);
            });
          } else {
            setPoints([]); // Jika tidak ada data
          }
        });





    // Inisialisasi peta
    const map = L.map('map', {
      center: [111.4819092, -7.8644782], // Ganti dengan koordinat awal
      zoom: 30, // Tingkat zoom
    });

    // Menambahkan tile layer leaflet
    L.tileLayer(
      'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      {
        maxZoom: 18,
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      }
    ).addTo(map);

    // Jika ingin menambahkan marker
    L.marker([-7.8644782,111.4819092], {icon : DefaultIcon}).addTo(map)
      .bindPopup('Your marker!')
      .openPopup();

    
    // *****

    // Variabel untuk mengatur panjang dan lebar kotak dalam meter
const gridLengthInMeters = 2; // Panjang kotak (latitude)
const gridWidthInMeters = 1; // Lebar kotak (longitude)

// Menyimpan posisi titik yang sudah ada dan grid yang sudah ditambahkan
const existingPoints = [];
const addedGrids = []; // Menyimpan grid yang sudah ditambahkan
let totalArea = 0; // Variabel untuk menyimpan luas total

// Fungsi untuk mengonversi meter ke derajat untuk latitude dan longitude
function metersToDegrees(lat, metersLat, metersLng) {
  const latDegree = metersLat / 111320; // 1 derajat lintang ≈ 111.32 km
  const lonDegree = metersLng / (111320 * Math.cos((lat * Math.PI) / 180)); // 1 derajat bujur tergantung pada lintang
  return { latDegree, lonDegree };
}

// Fungsi untuk menggambar satu grid persegi panjang di sekitar titik GPS
function drawRectangleGridSquare(lng, lat, lengthInMeters, widthInMeters) {
  const { latDegree, lonDegree } = metersToDegrees(lat, lengthInMeters, widthInMeters);

  // Buat koordinat untuk poligon (grid rectangle)
  const polygonCoords = [
    [lng - lonDegree / 2, lat - latDegree / 2], // Sudut kiri bawah
    [lng + lonDegree / 2, lat - latDegree / 2], // Sudut kanan bawah
    [lng + lonDegree / 2, lat + latDegree / 2], // Sudut kanan atas
    [lng - lonDegree / 2, lat + latDegree / 2], // Sudut kiri atas
    [lng - lonDegree / 2, lat - latDegree / 2], // Kembali ke sudut kiri bawah
  ];

  // Buat geometri poligon menggunakan Turf.js
  const gridRectangle = turf.polygon([polygonCoords]);

  // Tambahkan grid rectangle ke peta dengan garis tepi yang jelas
  L.geoJSON(gridRectangle, {
    style: function () {
      return { color: "blue", weight: 1, fillOpacity: 0.5 };
    },
  }).addTo(map);

  // Hitung luas dalam meter persegi
  const area = turf.area(gridRectangle);

  return { area, gridRectangle };
}
  function PointToMap(lat,lng){

    // Tambahkan marker pada titik GPS yang diklik
    const marker = L.marker([lat, lng], {icon : DefaultIcon}).addTo(map);
    existingPoints.push([lng, lat]); // Simpan titik yang baru

    // Hitung luas dan gambar grid persegi panjang di sekitar titik
    const { area, gridRectangle } = drawRectangleGridSquare(lng, lat, gridLengthInMeters, gridWidthInMeters);
    let intersectionArea = 0;
    // Jika tumpang tindih, loop untuk setiap grid yang tumpang tindih
    addedGrids.forEach((overlappingGrid, index) => {
      const intersection = turf.intersect(turf.featureCollection([overlappingGrid, gridRectangle]));

      // Hitung luas potongan
      if (intersection) intersectionArea = turf.area(intersection);

      // Gambar hasil potongan
      L.geoJSON(intersection, {
        style: function () {
          return { color: "red", weight: 1, fillOpacity: 0.5 }; // Warna garis tepi, ketebalan, dan opacity isi
        },
      }).addTo(map);
    });

    totalArea += area - intersectionArea; // Tambahkan area bukan potongan ke luas total

    addedGrids.push(gridRectangle); // Simpan grid yang baru ditambahkan

    marker.bindPopup(`Titik GPS (${lat.toFixed(4)}, ${lng.toFixed(4)})<br>Luas Grid: ${area.toFixed(2) - intersectionArea.toFixed(2)} m²<br>Total Luas: ${totalArea.toFixed(2)} m²`).openPopup();

    if (addedGrids.length > 1) {
      // Combine geometries of all added grids
      const combinedGrids = turf.union(turf.featureCollection([...addedGrids]));

      // tampikan grid yang sudah digabungkan di peta kedua
      // L.geoJSON(combinedGrids, {
      //   style: function () {
      //     return { color: "blue", weight: 1, fillOpacity: 1 };
      //   },
      // }).addTo(map2);

      // Tampilkan total luas di peta kedua
      // document.getElementById("luas").innerHTML = `Total Luas: ${totalArea.toFixed(2)} m²`;
    }
  }

  function removePoint(){
    // Hapus grid yang sudah ditambahkan
    addedGrids.forEach((grid) => {
      map.removeLayer(grid);
    });
  }

    // *****

    let arrayPoints = [
      [37.7751, -122.4203],
      [37.7751, -122.4202],
      [37.7750, -122.4202],
      [37.7750, -122.4202],
      [37.7749, -122.4202]
    ]

    console.log(points);
    // pointTomap
    // arrayPoints.forEach((point) => {
    //   PointToMap(point[0], point[1]);
    // });

    // Membersihkan saat komponen di-unmount
    return () => {
      map.remove();
      unsubscribe();
    };
  }, []);

  return <div id="map" style={{ height : height, width : width }} />;
};

export default MapComponent;