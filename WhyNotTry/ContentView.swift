//
//  ContentView.swift
//  WhyNotTry
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
            DiscoverView()
                .tabItem {
                    Label("Discover", systemImage: "sparkle.magnifyingglass")
                }

            ChecklistView()
                .tabItem {
                    Label("My List", systemImage: "checklist")
                }
        }
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

        let existingNames = Set(activities.map(\.name))

        for item in items where !existingNames.contains(item.name) {
            let activity = Activity(
                name: item.name,
                icon: item.icon,
                category: item.category
            )
            modelContext.insert(activity)
        }
    }
}

// MARK: - Discover View

struct DiscoverView: View {
    @Query private var activities: [Activity]
    @State private var selected: Activity?
    @State private var animationTrigger = 0

    private var colors: [Color] {
        [.blue, .cyan, .gray, .green, .indigo, .mint, .orange, .pink, .purple, .red]
    }

    var body: some View {
        NavigationStack {
            VStack {
                Text("Why not try..")
                    .font(.largeTitle.bold())

                Spacer()

                if let activity = selected {
                    VStack(spacing: 16) {
                        Circle()
                            .fill(colors.randomElement() ?? .blue)
                            .frame(width: 240, height: 240)
                            .overlay(
                                Image(systemName: activity.icon)
                                    .font(.system(size: 100))
                                    .foregroundStyle(.white)
                            )
                            .id(animationTrigger)

                        Text(activity.name)
                            .font(.title)
                            .bold()

                        Text(activity.category == "place" ? "Place to Visit" : "Activity")
                            .font(.subheadline)
                            .foregroundStyle(.secondary)

                        Button {
                            activity.visited.toggle()
                        } label: {
                            Label(
                                activity.visited ? "Done!" : "Mark as Done",
                                systemImage: activity.visited ? "checkmark.circle.fill" : "circle"
                            )
                        }
                        .buttonStyle(.bordered)
                        .tint(activity.visited ? .green : .primary)
                    }
                } else {
                    ContentUnavailableView(
                        "Tap the button below",
                        systemImage: "questionmark.circle",
                        description: Text("Get a random suggestion!")
                    )
                }

                Spacer()

                Button("Try something!") {
                    selected = activities.randomElement()
                    animationTrigger += 1
                }
                .buttonStyle(.borderedProminent)
                .sensoryFeedback(.selection, trigger: animationTrigger)
                .disabled(activities.isEmpty)
            }
            .padding()
        }
    }
}

// MARK: - Checklist View

struct ChecklistView: View {
    @Query(filter: #Predicate<Activity> { $0.category == "activity" },
           sort: \Activity.name)
    private var activityItems: [Activity]

    @Query(filter: #Predicate<Activity> { $0.category == "place" },
           sort: \Activity.name)
    private var placeItems: [Activity]

    var body: some View {
        NavigationStack {
            List {
                Section("Activities") {
                    ForEach(activityItems) { activity in
                        ActivityRow(activity: activity)
                    }
                }

                Section("LA Places") {
                    ForEach(placeItems) { activity in
                        ActivityRow(activity: activity)
                    }
                }
            }
            .navigationTitle("My List")
        }
    }
}

struct ActivityRow: View {
    @Bindable var activity: Activity

    var body: some View {
        Button {
            activity.visited.toggle()
        } label: {
            HStack(spacing: 12) {
                Image(systemName: activity.icon)
                    .font(.title2)
                    .foregroundStyle(activity.visited ? .green : .primary)
                    .frame(width: 32)

                Text(activity.name)
                    .foregroundStyle(.primary)

                Spacer()

                Image(systemName: activity.visited ? "checkmark.circle.fill" : "circle")
                    .foregroundStyle(activity.visited ? .green : .secondary)
                    .font(.title3)
            }
        }
    }
}

#Preview {
    ContentView()
        .modelContainer(for: Activity.self, inMemory: true)
}

