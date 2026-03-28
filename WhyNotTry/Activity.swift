//
//  Activity.swift
//  WhyNotTry
//
//  Created by Irene Tang on 12/20/25.
//

import Foundation
import SwiftData

@Model
final class Activity {
    #Unique<Activity>([\.name])

    var name: String
    var icon: String
    var category: String
    var visited: Bool

    init(name: String, icon: String, category: String, visited: Bool = false) {
        self.name = name
        self.icon = icon
        self.category = category
        self.visited = visited
    }
}

struct ActivityData: Codable {
    let name: String
    let icon: String
    let category: String
}
