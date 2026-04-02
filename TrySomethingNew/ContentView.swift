//
//  ContentView.swift
//  Try Something New
//
//  Created by Irene Tang on 12/20/25.
//

import SwiftUI
import SwiftData
import MapKit
import CoreLocation

// MARK: - Main

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

// MARK: - Explore View

struct ExploreView: View {
    @Query private var activities: [Activity]
    @AppStorage("selectedCity") private var selectedCity = "Los Angeles"
    @Environment(LocationManager.self) private var locationManager
    @State private var selected: Activity?
    @State private var animationTrigger = 0

    private var cityActivities: [Activity] {
        activities.filter { $0.city == selectedCity || $0.city == "Anywhere" }
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 24) {
                Spacer()

                if let activity = selected {
                    VStack(spacing: 16) {
                        Circle()
                            .fill(
                                LinearGradient(
                                    colors: Activity.subcategoryGradient(activity.subcategory),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                            .frame(width: 200, height: 200)
                            .shadow(color: Activity.subcategoryColor(activity.subcategory).opacity(0.4), radius: 20, y: 10)
                            .overlay(
                                Image(systemName: activity.icon)
                                    .font(.system(size: 80))
                                    .foregroundStyle(.white)
                            )

                        Text(activity.name)
                            .font(.title.bold())
                            .multilineTextAlignment(.center)

                        Text(Activity.subcategoryLabel(activity.subcategory))
                            .font(.caption.bold())
                            .padding(.horizontal, 12)
                            .padding(.vertical, 5)
                            .background(Activity.subcategoryColor(activity.subcategory).opacity(0.15))
                            .foregroundStyle(Activity.subcategoryColor(activity.subcategory))
                            .clipShape(Capsule())

                        // Location hint for universal items
                        if let hint = activity.locationHints[selectedCity], !hint.isEmpty {
                            Text("Try it at: \(hint)")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.center)
                                .padding(.horizontal, 24)
                        }

                        HStack(spacing: 8) {
                            MetadataTag(icon: "clock", text: activity.duration)
                            MetadataTag(icon: "dollarsign.circle", text: activity.cost)
                            if let coord = locationManager.coordinate,
                               let mins = activity.nearestDriveMinutes(userLat: coord.latitude, userLng: coord.longitude, cityName: selectedCity) {
                                MetadataTag(icon: "car.fill", text: "\(mins) min")
                            }
                        }

                        Button {
                            withAnimation(.spring(duration: 0.3)) {
                                activity.visited.toggle()
                            }
                        } label: {
                            Label(
                                activity.visited ? "Done!" : "Mark as Done",
                                systemImage: activity.visited ? "checkmark.circle.fill" : "circle"
                            )
                            .font(.subheadline.bold())
                        }
                        .buttonStyle(.bordered)
                        .tint(activity.visited ? .green : .secondary)
                    }
                    .id(animationTrigger)
                    .transition(.opacity.combined(with: .scale(scale: 0.9)))
                } else {
                    VStack(spacing: 12) {
                        Image(systemName: "questionmark.circle")
                            .font(.system(size: 60))
                            .foregroundStyle(.quaternary)
                        Text("What should you do today?")
                            .font(.headline)
                            .foregroundStyle(.secondary)
                        Text("Tap the button to find out!")
                            .font(.subheadline)
                            .foregroundStyle(.tertiary)
                    }
                }

                Spacer()

                if locationManager.coordinate != nil {
                    Text("Drive times from \(locationManager.displayName)")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }

                Button {
                    withAnimation(.spring(duration: 0.4)) {
                        selected = cityActivities.randomElement()
                        animationTrigger += 1
                    }
                } label: {
                    Text("Try something!")
                        .font(.headline)
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 4)
                }
                .buttonStyle(.borderedProminent)
                .controlSize(.large)
                .sensoryFeedback(.selection, trigger: animationTrigger)
                .disabled(cityActivities.isEmpty)
            }
            .padding()
            .background(Color(.systemGroupedBackground).ignoresSafeArea())
            .navigationTitle("Try Something New")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    CityPickerMenu(selectedCity: $selectedCity)
                }
                ToolbarItem(placement: .topBarTrailing) {
                    LocationPickerButton()
                }
            }
            .onChange(of: selectedCity) {
                selected = nil
            }
        }
    }
}

// MARK: - Checklist View

enum SortOption: String, CaseIterable, Identifiable {
    case name = "Name"
    case distance = "Distance"
    case duration = "Duration"
    case cost = "Cost"

    var id: String { rawValue }

    var icon: String {
        switch self {
        case .name: return "textformat"
        case .distance: return "car.fill"
        case .duration: return "clock"
        case .cost: return "dollarsign.circle"
        }
    }
}

enum StatusFilter: String, CaseIterable, Identifiable {
    case all = "All"
    case notDone = "Not Done"
    case done = "Done"

    var id: String { rawValue }
}

struct ChecklistView: View {
    @Query(sort: \Activity.name) private var allActivities: [Activity]
    @AppStorage("selectedCity") private var selectedCity = "Los Angeles"
    @Environment(LocationManager.self) private var locationManager
    @State private var sortBy: SortOption = .name
    @State private var selectedSubcategory: String?
    @State private var statusFilter: StatusFilter = .all
    @State private var searchText = ""

    private var cityFilteredAll: [Activity] {
        allActivities.filter { $0.city == selectedCity || $0.city == "Anywhere" }
    }

    private var subcategories: [String] {
        let subs = Set(cityFilteredAll.map(\.subcategory))
        return subs.sorted()
    }

    private var filteredActivities: [Activity] {
        var result = cityFilteredAll

        if let sub = selectedSubcategory {
            result = result.filter { $0.subcategory == sub }
        }

        switch statusFilter {
        case .all: break
        case .done: result = result.filter { $0.visited }
        case .notDone: result = result.filter { !$0.visited }
        }

        if !searchText.isEmpty {
            result = result.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
        }

        switch sortBy {
        case .name:
            result.sort { $0.name < $1.name }
        case .distance:
            result.sort { $0.driveMinutes < $1.driveMinutes }
        case .duration:
            result.sort { $0.durationMinutes < $1.durationMinutes }
        case .cost:
            result.sort { $0.costLevel < $1.costLevel }
        }

        return result
    }

    private var visitedCount: Int {
        cityFilteredAll.filter(\.visited).count
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Progress card
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "trophy.fill")
                            .foregroundStyle(.orange)
                        Text("\(visitedCount) of \(cityFilteredAll.count) completed")
                            .font(.subheadline.bold())
                        Spacer()
                        Text("\(cityFilteredAll.isEmpty ? 0 : Int(Double(visitedCount) / Double(cityFilteredAll.count) * 100))%")
                            .font(.subheadline.bold())
                            .foregroundStyle(.orange)
                    }
                    ProgressView(value: cityFilteredAll.isEmpty ? 0 : Double(visitedCount) / Double(cityFilteredAll.count))
                        .tint(.orange)
                    Text(locationManager.coordinate != nil ? "Drive times from \(locationManager.displayName)" : "Set your location for drive times")
                        .font(.caption2)
                        .foregroundStyle(.tertiary)
                }
                .padding()
                .background(
                    RoundedRectangle(cornerRadius: 12)
                        .fill(.orange.opacity(0.08))
                )
                .padding(.horizontal)
                .padding(.top, 8)

                // Status picker
                Picker("Status", selection: $statusFilter) {
                    ForEach(StatusFilter.allCases) { filter in
                        Text(filter.rawValue).tag(filter)
                    }
                }
                .pickerStyle(.segmented)
                .padding(.horizontal)
                .padding(.top, 12)

                // Subcategory filter chips
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        FilterChip(
                            title: "All",
                            icon: "square.grid.2x2",
                            color: .orange,
                            isSelected: selectedSubcategory == nil
                        ) {
                            withAnimation(.snappy) { selectedSubcategory = nil }
                        }

                        ForEach(subcategories, id: \.self) { sub in
                            FilterChip(
                                title: Activity.subcategoryLabel(sub),
                                icon: Activity.subcategoryIcon(sub),
                                color: Activity.subcategoryColor(sub),
                                isSelected: selectedSubcategory == sub
                            ) {
                                withAnimation(.snappy) {
                                    selectedSubcategory = selectedSubcategory == sub ? nil : sub
                                }
                            }
                        }
                    }
                    .padding(.horizontal)
                    .padding(.vertical, 10)
                }

                // Activity list
                List {
                    ForEach(filteredActivities) { activity in
                        ActivityRow(activity: activity)
                            .listRowSeparator(.hidden)
                            .listRowInsets(EdgeInsets(top: 4, leading: 16, bottom: 4, trailing: 16))
                    }
                }
                .listStyle(.plain)
                .overlay {
                    if filteredActivities.isEmpty {
                        ContentUnavailableView(
                            "No matches",
                            systemImage: "magnifyingglass",
                            description: Text("Try adjusting your filters.")
                        )
                    }
                }
            }
            .background(Color(.systemGroupedBackground).ignoresSafeArea())
            .navigationTitle("Checklist")
            .searchable(text: $searchText, prompt: "Search activities & places")
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    CityPickerMenu(selectedCity: $selectedCity)
                }
                ToolbarItem(placement: .topBarLeading) {
                    LocationPickerButton()
                }
                ToolbarItem(placement: .topBarTrailing) {
                    Menu {
                        ForEach(SortOption.allCases) { option in
                            Button {
                                withAnimation(.snappy) { sortBy = option }
                            } label: {
                                Label(option.rawValue, systemImage: option.icon)
                                    .symbolVariant(sortBy == option ? .fill : .none)
                            }
                        }
                    } label: {
                        Label("Sort", systemImage: "arrow.up.arrow.down")
                    }
                }
            }
            .onChange(of: selectedCity) {
                selectedSubcategory = nil
            }
        }
    }
}

// MARK: - City Picker Menu

struct CityPickerMenu: View {
    @Binding var selectedCity: String

    var body: some View {
        Menu {
            Picker("City", selection: $selectedCity) {
                ForEach(CityInfo.all, id: \.name) { city in
                    Label(city.name, systemImage: city.icon)
                        .tag(city.name)
                }
            }
        } label: {
            HStack(spacing: 5) {
                Image(systemName: CityInfo.find(selectedCity).icon)
                Text(selectedCity)
                    .font(.subheadline.bold())
                Image(systemName: "chevron.down")
                    .font(.caption2)
            }
            .foregroundStyle(.primary)
        }
    }
}

// MARK: - Activity Row

struct ActivityRow: View {
    @Bindable var activity: Activity
    @AppStorage("selectedCity") private var selectedCity = "Los Angeles"
    @Environment(LocationManager.self) private var locationManager

    private var computedDriveMinutes: Int? {
        guard let coord = locationManager.coordinate else { return nil }
        return activity.nearestDriveMinutes(userLat: coord.latitude, userLng: coord.longitude, cityName: selectedCity)
    }

    private var color: Color {
        Activity.subcategoryColor(activity.subcategory)
    }

    var body: some View {
        Button {
            withAnimation(.spring(duration: 0.3)) {
                activity.visited.toggle()
            }
        } label: {
            HStack(spacing: 12) {
                Image(systemName: activity.icon)
                    .font(.body.bold())
                    .foregroundStyle(.white)
                    .frame(width: 40, height: 40)
                    .background(
                        RoundedRectangle(cornerRadius: 10)
                            .fill(
                                LinearGradient(
                                    colors: Activity.subcategoryGradient(activity.subcategory),
                                    startPoint: .topLeading,
                                    endPoint: .bottomTrailing
                                )
                            )
                    )

                VStack(alignment: .leading, spacing: 4) {
                    Text(activity.name)
                        .font(.subheadline.bold())
                        .foregroundStyle(.primary)
                        .strikethrough(activity.visited, color: .secondary)

                    HStack(spacing: 6) {
                        Label(activity.cost, systemImage: "dollarsign.circle")
                        Text("·")
                        Label(activity.duration, systemImage: "clock")
                        if let mins = computedDriveMinutes {
                            Text("·")
                            Label("\(mins) min", systemImage: "car.fill")
                        }
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)

                    if let hint = activity.locationHints[selectedCity], !hint.isEmpty {
                        Text(hint)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                            .lineLimit(1)
                    }
                }

                Spacer()

                Image(systemName: activity.visited ? "checkmark.circle.fill" : "circle")
                    .font(.title3)
                    .foregroundStyle(activity.visited ? Color.green : Color.gray.opacity(0.3))
                    .contentTransition(.symbolEffect(.replace))
            }
            .padding(12)
            .background(
                RoundedRectangle(cornerRadius: 14)
                    .fill(activity.visited ? Color.green.opacity(0.05) : Color(.secondarySystemGroupedBackground))
            )
        }
    }
}

// MARK: - Supporting Views

struct MetadataTag: View {
    let icon: String
    let text: String

    var body: some View {
        HStack(spacing: 4) {
            Image(systemName: icon)
                .font(.caption2)
            Text(text)
                .font(.caption)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 5)
        .background(.ultraThinMaterial)
        .clipShape(Capsule())
    }
}

struct FilterChip: View {
    let title: String
    let icon: String
    let color: Color
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 4) {
                Image(systemName: icon)
                    .font(.caption2)
                Text(title)
                    .font(.caption.bold())
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 7)
            .background(isSelected ? color : color.opacity(0.1))
            .foregroundStyle(isSelected ? .white : color)
            .clipShape(Capsule())
        }
    }
}

// MARK: - Location Picker

struct LocationPickerButton: View {
    @Environment(LocationManager.self) private var locationManager
    @State private var showSheet = false

    var body: some View {
        Button {
            showSheet = true
        } label: {
            HStack(spacing: 5) {
                Image(systemName: locationManager.coordinate != nil ? "location.fill" : "location")
                Text(locationManager.displayName)
                    .font(.subheadline.bold())
                    .lineLimit(1)
                    .frame(maxWidth: 130, alignment: .leading)
                Image(systemName: "chevron.down")
                    .font(.caption2)
            }
            .foregroundStyle(.primary)
        }
        .sheet(isPresented: $showSheet) {
            LocationInputSheet(isPresented: $showSheet)
        }
    }
}

struct LocationInputSheet: View {
    @Environment(LocationManager.self) private var locationManager
    @Binding var isPresented: Bool
    @State private var addressText = ""
    @State private var isGeocoding = false
    @State private var completer = SearchCompleter()

    var body: some View {
        VStack(spacing: 16) {
            // Header
            HStack {
                Text("Your Location")
                    .font(.headline)
                Spacer()
                Button("Done") { isPresented = false }
                    .foregroundStyle(.blue)
            }

            // GPS button
            Button {
                locationManager.requestCurrentLocation()
                isPresented = false
            } label: {
                Label(
                    locationManager.isLocating ? "Locating…" : "Use My Current Location",
                    systemImage: "location.fill"
                )
                .frame(maxWidth: .infinity)
                .padding()
                .background(.blue.opacity(0.1))
                .foregroundStyle(.blue)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(locationManager.isLocating)

            // Address field
            HStack {
                TextField("Enter a city or address", text: $addressText)
                    .textFieldStyle(.roundedBorder)
                    .submitLabel(.search)
                    .autocorrectionDisabled()
                    .onSubmit { geocodeText() }
                    .onChange(of: addressText) { completer.update(query: addressText) }

                if isGeocoding {
                    ProgressView().padding(.horizontal, 4)
                } else if !addressText.isEmpty {
                    Button(action: geocodeText) {
                        Image(systemName: "arrow.right.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.blue)
                    }
                }
            }

            // Autocomplete suggestions
            if !completer.results.isEmpty {
                List(completer.results.prefix(6), id: \.self) { result in
                    Button {
                        isGeocoding = true
                        Task {
                            await locationManager.geocode(completion: result)
                            isGeocoding = false
                            isPresented = false
                        }
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(result.title)
                                .font(.subheadline)
                                .foregroundStyle(.primary)
                            if !result.subtitle.isEmpty {
                                Text(result.subtitle)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }
                .listStyle(.plain)
            } else {
                Spacer()
            }
        }
        .padding()
        .presentationDetents([.medium, .large])
    }

    private func geocodeText() {
        let trimmed = addressText.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        isGeocoding = true
        Task {
            await locationManager.geocode(trimmed)
            isGeocoding = false
            isPresented = false
        }
    }
}

// MARK: - Preview

#Preview {
    ContentView()
        .modelContainer(for: Activity.self, inMemory: true)
        .environment(LocationManager())
}
