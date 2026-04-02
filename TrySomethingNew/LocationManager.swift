//
//  LocationManager.swift
//  Try Something New
//
//  Created by Irene Tang on 12/20/25.
//

import CoreLocation
import Foundation
import MapKit

// MARK: - Location Manager

@Observable
final class LocationManager: NSObject, CLLocationManagerDelegate {
    private let manager = CLLocationManager()

    var coordinate: CLLocationCoordinate2D?
    var displayName: String = "Set Location"
    var isLocating: Bool = false

    override init() {
        super.init()
        manager.delegate = self
        manager.desiredAccuracy = kCLLocationAccuracyKilometer
    }

    func requestCurrentLocation() {
        isLocating = true
        switch manager.authorizationStatus {
        case .notDetermined:
            manager.requestWhenInUseAuthorization()
        case .authorizedWhenInUse, .authorizedAlways:
            manager.requestLocation()
        default:
            isLocating = false
        }
    }

    func geocode(_ address: String) async {
        isLocating = true
        defer { isLocating = false }
        guard let request = MKGeocodingRequest(addressString: address) else { return }
        let items = await withCheckedContinuation { continuation in
            request.getMapItems { items, _ in continuation.resume(returning: items ?? []) }
        }
        guard let item = items.first else { return }
        coordinate = item.location.coordinate
        displayName = item.addressRepresentations?.cityWithContext ?? address
    }

    func geocode(completion: MKLocalSearchCompletion) async {
        isLocating = true
        defer { isLocating = false }
        let request = MKLocalSearch.Request(completion: completion)
        guard let response = try? await MKLocalSearch(request: request).start(),
              let item = response.mapItems.first else { return }
        coordinate = item.location.coordinate
        displayName = item.addressRepresentations?.cityWithContext ?? completion.title
    }

    // MARK: - CLLocationManagerDelegate

    func locationManagerDidChangeAuthorization(_ manager: CLLocationManager) {
        if manager.authorizationStatus == .authorizedWhenInUse ||
           manager.authorizationStatus == .authorizedAlways {
            manager.requestLocation()
        } else {
            isLocating = false
        }
    }

    func locationManager(_ manager: CLLocationManager, didUpdateLocations locations: [CLLocation]) {
        guard let location = locations.first else { return }
        coordinate = location.coordinate
        isLocating = false
        guard let request = MKReverseGeocodingRequest(location: location) else { return }
        request.getMapItems { [weak self] items, _ in
            if let name = items?.first?.addressRepresentations?.cityWithContext {
                DispatchQueue.main.async { self?.displayName = name }
            }
        }
    }

    func locationManager(_ manager: CLLocationManager, didFailWithError error: Error) {
        isLocating = false
    }
}

// MARK: - Search Completer

@Observable
final class SearchCompleter: NSObject, MKLocalSearchCompleterDelegate {
    private let completer = MKLocalSearchCompleter()
    var results: [MKLocalSearchCompletion] = []

    override init() {
        super.init()
        completer.delegate = self
        completer.resultTypes = [.address, .pointOfInterest]
    }

    func update(query: String) {
        completer.queryFragment = query
    }

    func completerDidUpdateResults(_ completer: MKLocalSearchCompleter) {
        results = completer.results
    }

    func completer(_ completer: MKLocalSearchCompleter, didFailWithError error: Error) {
        results = []
    }
}
