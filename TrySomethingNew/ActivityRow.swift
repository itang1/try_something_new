//
//  ActivityRow.swift
//  Try Something New
//
//  Created by Irene Tang on 12/20/25.
//

import SwiftUI
import CoreLocation

struct ActivityRow: View {
    @Bindable var activity: Activity
    @AppStorage("selectedCity") private var selectedCity = "Los Angeles"
    @Environment(LocationManager.self) private var locationManager

    private var computedDriveMinutes: Int? {
        guard let coord = locationManager.coordinate else { return nil }
        return activity.nearestDriveMinutes(userLat: coord.latitude, userLng: coord.longitude, cityName: selectedCity)
    }

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
                        if let mins = computedDriveMinutes {
                            Text("·")
                            Label("\(mins) min", systemImage: "car.fill")
                        }
                    }
                    .font(.caption)
                    .foregroundStyle(.secondary)

                    if let hint = activity.locationHints[selectedCity], !hint.isEmpty {
                        Text(hint)
                            .font(.caption)
                            .foregroundStyle(.tertiary)
                            .lineLimit(1)
                    }
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
