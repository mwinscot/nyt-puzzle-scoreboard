import os
import requests
from datetime import datetime

# The base URL for the API - use localhost in development, production URL in deployment
BASE_URL = "https://nyt-puzzle-scoreboard-mbkd0jcgb-mike-winscotts-projects.vercel.app/api"

def fetch_february_scores():
    url = f"{BASE_URL}/scores"
    params = {
        'month': '2024-02'
    }
    
    try:
        response = requests.get(url, params=params)
        response.raise_for_status()
        scores = response.json()
        
        if not scores:
            print("No scores found for February 2024")
            return
        
        # Process each player's scores
        for player_key, player_data in scores.items():
            player_name = {
                'player1': 'Keith',
                'player2': 'Mike',
                'player3': 'Colleen',
                'player4': 'Sarah'
            }[player_key]
            
            print(f"\n{player_name}'s February scores:")
            for date, score in player_data['dailyScores'].items():
                print(f"{date}: {score['total']} points")
                if any([score['bonusPoints']['wordleQuick'], 
                       score['bonusPoints']['connectionsPerfect'],
                       score['bonusPoints']['strandsSpanagram']]):
                    bonuses = []
                    if score['bonusPoints']['wordleQuick']: bonuses.append("Wordle")
                    if score['bonusPoints']['connectionsPerfect']: bonuses.append("Connections")
                    if score['bonusPoints']['strandsSpanagram']: bonuses.append("Strands")
                    print(f"  Bonus points: {', '.join(bonuses)}")
            
            print(f"Total score: {player_data['total']}")
            print(f"Total bonuses: Wordle: {player_data['totalBonuses']['wordle']}, "
                  f"Connections: {player_data['totalBonuses']['connections']}, "
                  f"Strands: {player_data['totalBonuses']['strands']}")
            
    except requests.exceptions.RequestException as e:
        print(f"Error fetching scores: {str(e)}")
        if hasattr(e.response, 'text'):
            print(f"Response: {e.response.text}")

def update_score(date, player_name, wordle=None, connections=None, strands=None, 
                bonus_wordle=None, bonus_connections=None, bonus_strands=None):
    url = f"{BASE_URL}/scores/update"  # You'll need to create this endpoint
    
    # Build update data
    update_data = {
        'date': date,
        'playerName': player_name,
        'scores': {
            'wordle': wordle,
            'connections': connections,
            'strands': strands,
            'bonusWordle': bonus_wordle,
            'bonusConnections': bonus_connections,
            'bonusStrands': bonus_strands
        }
    }
    
    try:
        response = requests.post(url, json=update_data)
        response.raise_for_status()
        print(f"Successfully updated score for {player_name} on {date}")
        
    except requests.exceptions.RequestException as e:
        print(f"Error updating score: {str(e)}")
        if hasattr(e.response, 'text'):
            print(f"Response: {e.response.text}")

def archive_february():
    url = f"{BASE_URL}/scores/archive"  # You'll need to create this endpoint
    
    try:
        response = requests.post(
            url,
            json={
                'month': '2024-02'
            }
        )
        response.raise_for_status()
        print("Successfully archived February scores")
        
    except requests.exceptions.RequestException as e:
        print(f"Error archiving scores: {str(e)}")
        if hasattr(e.response, 'text'):
            print(f"Response: {e.response.text}")

if __name__ == "__main__":
    while True:
        print("\nWhat would you like to do?")
        print("1. View February scores")
        print("2. Update a score")
        print("3. Archive February scores")
        print("4. Exit")
        
        choice = input("Enter your choice (1-4): ")
        
        if choice == "1":
            fetch_february_scores()
        elif choice == "2":
            date = input("Enter date (YYYY-MM-DD): ")
            player = input("Enter player name (Keith/Mike/Colleen/Sarah): ")
            wordle = int(input("Enter Wordle score (or press Enter to skip): ") or -1)
            connections = int(input("Enter Connections score (or press Enter to skip): ") or -1)
            strands = int(input("Enter Strands score (or press Enter to skip): ") or -1)
            bonus_wordle = input("Bonus Wordle? (y/N): ").lower() == 'y'
            bonus_connections = input("Bonus Connections? (y/N): ").lower() == 'y'
            bonus_strands = input("Bonus Strands? (y/N): ").lower() == 'y'
            
            update_score(
                date, player,
                wordle if wordle != -1 else None,
                connections if connections != -1 else None,
                strands if strands != -1 else None,
                bonus_wordle, bonus_connections, bonus_strands
            )
        elif choice == "3":
            confirm = input("Are you sure you want to archive February scores? (y/N): ")
            if confirm.lower() == 'y':
                archive_february()
        elif choice == "4":
            break
        else:
            print("Invalid choice. Please try again.")