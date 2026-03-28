//
//  WhyNotTryApp.swift
//  WhyNotTry
//
//  Created by Irene Tang on 12/20/25.
//

import SwiftUI
import SwiftData

@main
struct WhyNotTryApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
        }
        .modelContainer(for: Activity.self)
    }
}
