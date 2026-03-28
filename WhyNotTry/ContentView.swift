//
//  ContentView.swift
//  WhyNotTry
//
//  Created by Irene Tang on 12/20/25.
//

import SwiftUI

struct ContentView: View {
    var activities = [
        "Archery", "Baseball", "Basketball", "Badminton", "Biking", "Bowling", "Boxing", "Climbing", "Cricket", "Dancing", "Diving", "Fencing", "Fishing", "Football", "Frisbee", "Golf", "Gymnastics", "Hiking", "Hockey", "Horseback Riding", "Ice Skating", "Jogging", "Judo", "Kayaking", "Karate", "Kitesurfing", "Lacrosse", "Martial Arts", "Mountain Biking", "Paddleboarding", "Paragliding", "Parkour", "Ping Pong", "Pilates", "RIowing", "Rugby", "Running", "Sailing", "Skateboarding", "Skiing", "Snowboarding", "Soccer", "Softball", "Squash", "Surfing", "Swimming", "Tennis", "Track", "Ultimate", "Volleyball", "Walking", "Weightlifting", "Windsurfing", "Yoga"
    ]
    var colors: [Color] = [.blue, .cyan, .gray, .green, .indigo, .mint, .orange, .pink, .purple, .red]
    @State private var selected = "Archery"
    @State private var id = 1
    
    var body: some View {
        VStack {
            Text("Why not try..")
                .font(.largeTitle.bold())
            
            Spacer()
            
            VStack{
                Circle()
                    .fill(colors.randomElement() ?? .blue)
                    .padding()
                    .overlay(
                        Image(systemName: "figure.\(selected.lowercased())")
                            .font(.system(size:144))
                            .foregroundColor(.white)
                    )
                
                Text("\(selected)")
                    .font(.title)
            }
            
            Spacer()
            
            Button("Try again") {
                selected = activities.randomElement() ?? "Archery"
                id += 1
            }
            .buttonStyle(.borderedProminent)
            .sensoryFeedback(.selection, trigger: selected)
        }
    }
}

#Preview {
    ContentView()
}

