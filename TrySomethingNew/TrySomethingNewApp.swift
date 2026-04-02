//
//  TrySomethingNewApp.swift
//  Try Something New
//
//  Created by Irene Tang on 12/20/25.
//

import SwiftUI
import SwiftData

@main
struct TrySomethingNewApp: App {
    @State private var locationManager = LocationManager()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(locationManager)
        }
        .modelContainer(for: Activity.self)
    }
}
