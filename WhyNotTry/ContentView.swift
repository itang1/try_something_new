//
//  ContentView.swift
//  WhyNotTry
//
//  Created by Irene Tang on 12/20/25.
//

import SwiftUI
import SwiftData

// MARK: - Main

struct ContentView: View {
    @Environment(\.modelContext) private var modelContext
    @Query private var activities: [Activity]

    var body: some View {
        TabView {
            DiscoverView()
                .tabItem {
                    Label("Discover", systemImage: "sparkle.magnifyingglass")
                }

            ChecklistView()
                .tabItem {
                    Label("My List", systemImage: "checklist")
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
              let items = try? JSONDecoder().decode([ActivityData].self, from: data) else {
            return
        }

        let existingByName = Dictionary(uniqueKeysWithValues: activities.map { ($0.name, $0) })

        for item in items {
            if let existing = existingByName[item.name] {
                existing.icon = item.icon
                existing.subcategory = item.subcategory
                existing.duration = item.duration
                existing.cost = item.cost
                existing.driveMinutesFromPasadena = item.driveMinutesFromPasadena
            } else {
                let activity = Activity(
                    name: item.name,
                    icon: item.icon,
                    category: item.category,
                    subcategory: item.subcategory,
                    duration: item.duration,
                    cost: item.cost,
                    driveMinutesFromPasadena: item.driveMinutesFromPasadena
                )
                modelContext.insert(activity)
            }
        }
    }
}

// MARK: - Discover View

struct DiscoverView: View {
    @Query private var activities: [Activity]
    @State private var selected: Activity?
    @State private var animationTrigger = 0

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

                        HStack(spacing: 8) {
                            MetadataTag(icon: "clock", text: activity.duration)
                            MetadataTag(icon: "dollarsign.circle", text: activity.cost)
                            if activity.driveMinutesFromPasadena > 0 {
                                MetadataTag(icon: "car.fill", text: "\(activity.driveMinutesFromPasadena) min")
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

                Button {
                    withAnimation(.spring(duration: 0.4)) {
                        selected = activities.randomElement()
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
                .disabled(activities.isEmpty)
            }
            .padding()
            .background(Color(.systemGroupedBackground).ignoresSafeArea())
            .navigationTitle("Why Not Try")
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
    @State private var sortBy: SortOption = .name
    @State private var selectedSubcategory: String?
    @State private var statusFilter: StatusFilter = .all
    @State private var searchText = ""

    private var subcategories: [String] {
        let subs = Set(allActivities.map(\.subcategory))
        return subs.sorted()
    }

    private var filteredActivities: [Activity] {
        var result = allActivities

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
            result.sort { $0.driveMinutesFromPasadena < $1.driveMinutesFromPasadena }
        case .duration:
            result.sort { $0.durationMinutes < $1.durationMinutes }
        case .cost:
            result.sort { $0.costLevel < $1.costLevel }
        }

        return result
    }

    private var visitedCount: Int {
        allActivities.filter(\.visited).count
    }

    var body: some View {
        NavigationStack {
            VStack(spacing: 0) {
                // Progress card
                VStack(alignment: .leading, spacing: 8) {
                    HStack {
                        Image(systemName: "trophy.fill")
                            .foregroundStyle(.orange)
                        Text("\(visitedCount) of \(allActivities.count) completed")
                            .font(.subheadline.bold())
                        Spacer()
                        Text("\(allActivities.isEmpty ? 0 : Int(Double(visitedCount) / Double(allActivities.count) * 100))%")
                            .font(.subheadline.bold())
                            .foregroundStyle(.orange)
                    }
                    ProgressView(value: allActivities.isEmpty ? 0 : Double(visitedCount) / Double(allActivities.count))
                        .tint(.orange)
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
            .navigationTitle("My List")
            .searchable(text: $searchText, prompt: "Search activities & places")
            .toolbar {
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
        }
    }
}

// MARK: - Activity Row

struct ActivityRow: View {
    @Bindable var activity: Activity

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
                        if activity.driveMinutesFromPasadena > 0 {
                            Text("·")
                            Label("\(activity.driveMinutesFromPasadena) min", systemImage: "car.fill")
                        }
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)
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

// MARK: - Preview

#Preview {
    ContentView()
        .modelContainer(for: Activity.self, inMemory: true)
}

