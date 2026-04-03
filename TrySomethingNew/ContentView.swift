//
//  ContentView.swift
//  Try Something New
//
//  Created by Irene Tang on 12/20/25.
//

import SwiftUI
import SwiftData

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var activities: [Activity]

    var body: some View {
        TabView {
            ExploreView()
                .tabItem {
                    Label("Explore", systemImage: "sparkle.magnifyingglass")
                }

            ChecklistView()
                .tabItem {
                    Label("Checklist", systemImage: "checklist")
                }
        }
        .tint(.orange)
        .task {
            await seedDataIfNeeded()
        }
    }

    private func seedDataIfNeeded() async {
        guard let url = Bundle.main.url(forResource: "activities", withExtension: "json"),
              let data = try? Data(contentsOf: url),
              let wrapper = try? JSONDecoder().decode(ActivitiesJSON.self, from: data) else {
            return
        }

        let cityIdToName = Dictionary(uniqueKeysWithValues: wrapper.cities.map { ($0.id, $0.name) })
        let existingByName = Dictionary(uniqueKeysWithValues: activities.map { ($0.name, $0) })

        for raw in wrapper.activities {
            let cityName = cityIdToName[raw.cityId] ?? "Anywhere"

            // Display hints: city name → comma-separated venue names
            let hints: [String: String] = raw.locationHints?.reduce(into: [:]) { result, pair in
                let name = cityIdToName[pair.key] ?? pair.key
                result[name] = pair.value.locations.map(\.name).joined(separator: ", ")
            } ?? [:]

            // Location JSON: city name → [{name, lat, lng}] for drive time computation
            var venuesByCityName: [String: [VenueLocation]] = [:]
            if let hints = raw.locationHints {
                // "Anywhere" activities: venues grouped by city inside locationHints
                hints.forEach { cityId, group in
                    let name = cityIdToName[cityId] ?? cityId
                    venuesByCityName[name] = group.locations.compactMap { loc in
                        guard let lat = loc.lat, let lng = loc.lng else { return nil }
                        return VenueLocation(name: loc.name, lat: lat, lng: lng)
                    }
                }
            } else if let lat = raw.lat, let lng = raw.lng {
                // City-specific activities: single lat/lng on the activity itself
                venuesByCityName[cityName] = [VenueLocation(name: raw.name, lat: lat, lng: lng)]
            }
            let locationJSON = (try? String(data: JSONEncoder().encode(venuesByCityName), encoding: .utf8)) ?? "{}"

            if let existing = existingByName[raw.name] {
                existing.icon = raw.icon
                existing.subcategory = raw.subcategory
                existing.duration = raw.duration
                existing.cost = raw.cost
                existing.driveMinutes = 0
                existing.city = cityName
                existing.locationHints = hints
                existing.locationJSON = locationJSON
            } else {
                let activity = Activity(
                    name: raw.name,
                    icon: raw.icon,
                    subcategory: raw.subcategory,
                    duration: raw.duration,
                    cost: raw.cost,
                    driveMinutes: 0,
                    city: cityName,
                    locationHints: hints,
                    locationJSON: locationJSON
                )
                modelContext.insert(activity)
            }
        }
    }
}

// MARK: - Preview

#Preview {
    ContentView()
        .modelContainer(for: Activity.self, inMemory: true)
        .environment(LocationManager())
}
