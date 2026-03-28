//
//  Activity.swift
//  WhyNotTry
//
//  Created by Irene Tang on 12/20/25.
//

import Foundation
import SwiftData
import SwiftUI

@Model
final class Activity {
    #Unique<Activity>([\.name])

    var name: String
    var icon: String
    var category: String
    var subcategory: String = "sport"
    var visited: Bool
    var duration: String = "1-2 hours"
    var cost: String = "Free"
    var driveMinutesFromPasadena: Int = 0

    init(name: String, icon: String, category: String, subcategory: String = "sport",
         visited: Bool = false, duration: String = "1-2 hours", cost: String = "Free",
         driveMinutesFromPasadena: Int = 0) {
        self.name = name
        self.icon = icon
        self.category = category
        self.subcategory = subcategory
        self.visited = visited
        self.duration = duration
        self.cost = cost
        self.driveMinutesFromPasadena = driveMinutesFromPasadena
    }

    var durationMinutes: Int {
        switch duration {
        case "30 min": return 30
        case "1 hour": return 60
        case "1-2 hours": return 90
        case "2-3 hours": return 150
        case "Half day": return 240
        case "Full day": return 480
        default: return 0
        }
    }

    var costLevel: Int {
        switch cost {
        case "Free": return 0
        case "$": return 1
        case "$$": return 2
        case "$$$": return 3
        default: return 0
        }
    }

    static func subcategoryColor(_ subcategory: String) -> Color {
        switch subcategory {
        case "sport": return .orange
        case "museum": return .purple
        case "hike": return .green
        case "beach": return .cyan
        case "food": return .red
        case "shopping": return .pink
        case "nature": return .mint
        case "entertainment": return .indigo
        case "landmark": return .brown
        case "neighborhood": return .teal
        default: return .gray
        }
    }

    static func subcategoryGradient(_ subcategory: String) -> [Color] {
        switch subcategory {
        case "sport": return [.orange, .red]
        case "museum": return [.purple, .indigo]
        case "hike": return [.green, .teal]
        case "beach": return [.cyan, .blue]
        case "food": return [.red, .orange]
        case "shopping": return [.pink, .purple]
        case "nature": return [.mint, .green]
        case "entertainment": return [.indigo, .purple]
        case "landmark": return [.brown, .orange]
        case "neighborhood": return [.teal, .cyan]
        default: return [.gray, .secondary]
        }
    }

    static func subcategoryLabel(_ subcategory: String) -> String {
        switch subcategory {
        case "sport": return "Sport"
        case "museum": return "Museum"
        case "hike": return "Hike"
        case "beach": return "Beach"
        case "food": return "Food & Drink"
        case "shopping": return "Shopping"
        case "nature": return "Nature"
        case "entertainment": return "Entertainment"
        case "landmark": return "Landmark"
        case "neighborhood": return "Neighborhood"
        default: return subcategory.capitalized
        }
    }

    static func subcategoryIcon(_ subcategory: String) -> String {
        switch subcategory {
        case "sport": return "figure.run"
        case "museum": return "building.columns"
        case "hike": return "figure.hiking"
        case "beach": return "umbrella.fill"
        case "food": return "fork.knife"
        case "shopping": return "bag.fill"
        case "nature": return "leaf.fill"
        case "entertainment": return "star.fill"
        case "landmark": return "mappin.circle.fill"
        case "neighborhood": return "building.2.fill"
        default: return "questionmark"
        }
    }
}

struct ActivityData: Codable {
    let name: String
    let icon: String
    let category: String
    let subcategory: String
    let duration: String
    let cost: String
    let driveMinutesFromPasadena: Int
}
