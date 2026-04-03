//
//  SharedComponents.swift
//  Try Something New
//
//  Created by Irene Tang on 12/20/25.
//

import SwiftUI

// MARK: - City Picker Menu

struct CityPickerMenu: View {
    @Binding var selectedCity: String

    var body: some View {
        Menu {
            Picker("City", selection: $selectedCity) {
                ForEach(CityInfo.all, id: \.name) { city in
                    Label(city.name, systemImage: city.icon)
                        .tag(city.name)
                }
            }
        } label: {
            HStack(spacing: 5) {
                Image(systemName: CityInfo.find(selectedCity).icon)
                Text(selectedCity)
                    .font(.subheadline.bold())
                Image(systemName: "chevron.down")
                    .font(.caption2)
            }
            .foregroundStyle(.primary)
        }
    }
}

// MARK: - Metadata Tag

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

// MARK: - Filter Chip

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
