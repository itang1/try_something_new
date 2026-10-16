//
//  ChecklistView.swift
//  Try Something New
//
//  Created by Irene Tang on 12/20/25.
//

import SwiftUI
import SwiftData

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
                        .font(.footnote)
                        .foregroundStyle(.secondary)
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
