//
//  ExploreView.swift
//  Try Something New
//
//  Created by Irene Tang on 12/20/25.
//

import SwiftUI
import SwiftData
import CoreLocation

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
