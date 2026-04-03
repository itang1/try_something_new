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
            Activity.seedIfNeeded(context: modelContext, existing: activities)
        }
    }
}

// MARK: - Preview

#Preview {
    ContentView()
        .modelContainer(for: Activity.self, inMemory: true)
        .environment(LocationManager())
}
