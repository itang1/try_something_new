//
//  LocationPickerButton.swift
//  Try Something New
//
//  Created by Irene Tang on 12/20/25.
//

import SwiftUI
import MapKit

struct LocationPickerButton: View {
    @Environment(LocationManager.self) private var locationManager
    @State private var showSheet = false

    var body: some View {
        Button {
            showSheet = true
        } label: {
            HStack(spacing: 5) {
                Image(systemName: locationManager.coordinate != nil ? "location.fill" : "location")
                Text(locationManager.displayName)
                    .font(.subheadline.bold())
                    .lineLimit(1)
                    .frame(maxWidth: 130, alignment: .leading)
                Image(systemName: "chevron.down")
                    .font(.caption2)
            }
            .foregroundStyle(.primary)
        }
        .sheet(isPresented: $showSheet) {
            LocationInputSheet(isPresented: $showSheet)
        }
    }
}

struct LocationInputSheet: View {
    @Environment(LocationManager.self) private var locationManager
    @Binding var isPresented: Bool
    @State private var addressText = ""
    @State private var isGeocoding = false
    @State private var completer = SearchCompleter()
    @AppStorage("recentAddresses") private var recentAddressesData = ""

    private var recentAddresses: [String] {
        guard !recentAddressesData.isEmpty,
              let data = recentAddressesData.data(using: .utf8),
              let addresses = try? JSONDecoder().decode([String].self, from: data) else {
            return []
        }
        return addresses
    }

    private func saveToRecent(_ address: String) {
        var current = recentAddresses
        current.removeAll { $0 == address }
        current.insert(address, at: 0)
        if current.count > 5 { current = Array(current.prefix(5)) }
        if let data = try? JSONEncoder().encode(current),
           let str = String(data: data, encoding: .utf8) {
            recentAddressesData = str
        }
    }

    var body: some View {
        VStack(spacing: 16) {
            // Header
            HStack {
                Text("Your Location")
                    .font(.headline)
                Spacer()
                Button("Done") { isPresented = false }
                    .foregroundStyle(.blue)
            }

            // GPS button
            Button {
                locationManager.requestCurrentLocation()
                isPresented = false
            } label: {
                Label(
                    locationManager.isLocating ? "Locating…" : "Use My Current Location",
                    systemImage: "location.fill"
                )
                .frame(maxWidth: .infinity)
                .padding()
                .background(.blue.opacity(0.1))
                .foregroundStyle(.blue)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            }
            .disabled(locationManager.isLocating)

            // Address field
            HStack {
                TextField("Enter a city or address", text: $addressText)
                    .textFieldStyle(.roundedBorder)
                    .submitLabel(.search)
                    .autocorrectionDisabled()
                    .onSubmit { geocodeText() }
                    .onChange(of: addressText) { completer.update(query: addressText) }

                if isGeocoding {
                    ProgressView().padding(.horizontal, 4)
                } else if !addressText.isEmpty {
                    Button(action: geocodeText) {
                        Image(systemName: "arrow.right.circle.fill")
                            .font(.title3)
                            .foregroundStyle(.blue)
                    }
                }
            }

            // Autocomplete suggestions or recent searches
            if !completer.results.isEmpty {
                List(completer.results.prefix(6), id: \.self) { result in
                    Button {
                        isGeocoding = true
                        Task {
                            await locationManager.geocode(completion: result)
                            saveToRecent(locationManager.displayName)
                            isGeocoding = false
                            isPresented = false
                        }
                    } label: {
                        VStack(alignment: .leading, spacing: 2) {
                            Text(result.title)
                                .font(.subheadline)
                                .foregroundStyle(.primary)
                            if !result.subtitle.isEmpty {
                                Text(result.subtitle)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                        }
                        .padding(.vertical, 2)
                    }
                }
                .listStyle(.plain)
            } else if !recentAddresses.isEmpty && addressText.isEmpty {
                // Recent searches shown when text field is empty
                VStack(alignment: .leading, spacing: 4) {
                    Text("Recent")
                        .font(.caption.bold())
                        .foregroundStyle(.secondary)
                        .padding(.horizontal, 4)
                    ForEach(recentAddresses, id: \.self) { address in
                        Button {
                            isGeocoding = true
                            Task {
                                await locationManager.geocode(address)
                                saveToRecent(locationManager.displayName)
                                isGeocoding = false
                                isPresented = false
                            }
                        } label: {
                            HStack(spacing: 10) {
                                Image(systemName: "clock.arrow.circlepath")
                                    .font(.subheadline)
                                    .foregroundStyle(.secondary)
                                Text(address)
                                    .font(.subheadline)
                                    .foregroundStyle(.primary)
                                Spacer()
                            }
                            .padding(.vertical, 8)
                            .padding(.horizontal, 4)
                        }
                        if address != recentAddresses.last {
                            Divider().padding(.leading, 34)
                        }
                    }
                }
                .padding(.top, 4)
                Spacer()
            } else {
                Spacer()
            }
        }
        .padding()
        .presentationDetents([.medium, .large])
    }

    private func geocodeText() {
        let trimmed = addressText.trimmingCharacters(in: .whitespaces)
        guard !trimmed.isEmpty else { return }
        isGeocoding = true
        Task {
            await locationManager.geocode(trimmed)
            saveToRecent(locationManager.displayName)
            isGeocoding = false
            isPresented = false
        }
    }
}
