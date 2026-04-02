//
//  Activity.swift
//  MyBucketList
//
//  Created by Irene Tang on 12/20/25.
//

import Foundation
import SwiftData
import SwiftUI

// MARK: - City Info

struct CityInfo {
    let name: String
    let reference: String
    let icon: String

    static let all: [CityInfo] = [
        CityInfo(name: "Los Angeles", reference: "Pasadena", icon: "sun.max.fill"),
        CityInfo(name: "Columbus", reference: "Milford Center", icon: "leaf.fill")
    ]

    static func find(_ name: String) -> CityInfo {
        all.first { $0.name == name } ?? all[0]
    }
}

// MARK: - Activity Model

@Model
final class Activity {
    #Unique<Activity>([\.name])

    var name: String
    var icon: String
    var subcategory: String = "outdoor"
    var visited: Bool = false
    var duration: String = "1-2 hours"
    var cost: String = "Free"
    var driveMinutes: Int = 0
    var city: String = "Los Angeles"
    var locationHints: [String: String] = [:]

    init(name: String, icon: String, subcategory: String = "outdoor",
         visited: Bool = false, duration: String = "1-2 hours", cost: String = "Free",
         driveMinutes: Int = 0, city: String = "Los Angeles", locationHints: [String: String] = [:]) {
        self.name = name
        self.icon = icon
        self.subcategory = subcategory
        self.visited = visited
        self.duration = duration
        self.cost = cost
        self.driveMinutes = driveMinutes
        self.city = city
        self.locationHints = locationHints
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
        case "outdoor": return .orange
        case "museum": return .purple
        case "hike": return .green
        case "beach": return .cyan
        case "food": return .red
        case "shopping": return .pink
        case "nature": return .mint
        case "entertainment": return .indigo
        case "landmark": return .brown
        case "neighborhoods": return .teal
        case "craft": return Color(red: 0.85, green: 0.25, blue: 0.65)
        default: return .gray
        }
    }

    static func subcategoryGradient(_ subcategory: String) -> [Color] {
        switch subcategory {
        case "outdoor": return [.orange, .red]
        case "museum": return [.purple, .indigo]
        case "hike": return [.green, .teal]
        case "beach": return [.cyan, .blue]
        case "food": return [.red, .orange]
        case "shopping": return [.pink, .purple]
        case "nature": return [.mint, .green]
        case "entertainment": return [.indigo, .purple]
        case "landmark": return [.brown, .orange]
        case "neighborhoods": return [.teal, .cyan]
        case "craft": return [Color(red: 0.85, green: 0.25, blue: 0.65), .purple]
        default: return [.gray, Color(.secondaryLabel)]
        }
    }

    static func subcategoryLabel(_ subcategory: String) -> String {
        switch subcategory {
        case "outdoor": return "Outdoor"
        case "museum": return "Museum"
        case "hike": return "Hike"
        case "beach": return "Beach"
        case "food": return "Food & Drink"
        case "shopping": return "Shopping"
        case "nature": return "Nature"
        case "entertainment": return "Entertainment"
        case "landmark": return "Landmark"
        case "neighborhoods": return "Neighborhoods"
        case "craft": return "Craft"
        default: return subcategory.capitalized
        }
    }

    static func subcategoryIcon(_ subcategory: String) -> String {
        switch subcategory {
        case "outdoor": return "figure.run"
        case "museum": return "building.columns"
        case "hike": return "figure.hiking"
        case "beach": return "umbrella.fill"
        case "food": return "fork.knife"
        case "shopping": return "bag.fill"
        case "nature": return "leaf.fill"
        case "entertainment": return "star.fill"
        case "landmark": return "mappin.circle.fill"
        case "neighborhoods": return "building.2.fill"
        case "craft": return "scissors"
        default: return "questionmark"
        }
    }
}

// MARK: - JSON Decoding Structs

struct ActivitiesJSON: Codable {
    let cities: [CityJSON]
    let activities: [ActivityRaw]
}

struct CityJSON: Codable {
    let id: String
    let name: String
}

struct LocationPoint: Codable {
    let name: String
    let lat: Double?
    let lng: Double?
}

struct LocationGroup: Codable {
    let locations: [LocationPoint]
}

struct ActivityRaw: Codable {
    let name: String
    let icon: String
    let cityId: String
    let subcategory: String
    let duration: String
    let cost: String
    let locationHints: [String: LocationGroup]?
}
