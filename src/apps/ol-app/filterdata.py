import pandas as pd
import os

def filter_csv_files(directory):
    """
    Durchsucht ein Verzeichnis nach CSV-Dateien, filtert basierend auf IstRad == 1 und ULAND in ['05', '5'],
    und überschreibt die ursprünglichen Dateien. CSV-Dateien sind mit ';' getrennt.
    
    :param directory: Pfad zum Verzeichnis mit den CSV-Dateien
    """
    # Liste aller Dateien im Verzeichnis
    files = [f for f in os.listdir(directory) if f.endswith('.csv')]
    
    for file in files:
        file_path = os.path.join(directory, file)
        
        try:
            # CSV-Datei einlesen (Trennzeichen ist ';')
            df = pd.read_csv(file_path, sep=';')
            
            # Prüfen, ob die benötigten Spalten existieren
            if 'IstRad' in df.columns and 'ULAND' in df.columns:
                # Datentypen bereinigen
                df['IstRad'] = pd.to_numeric(df['IstRad'], errors='coerce')  # In Zahl umwandeln
                df['ULAND'] = df['ULAND'].astype(str)  # In Text umwandeln
                
                # Daten filtern (ULAND darf '05' oder '5' sein)
                filtered_df = df[(df['IstRad'] == 1) & (df['ULAND'].isin(['05', '5']))]
                
                # Gefilterte Daten zurück in die Datei schreiben (mit ';' als Trennzeichen)
                filtered_df.to_csv(file_path, sep=';', index=False)
                print(f"Datei '{file}' wurde erfolgreich gefiltert und überschrieben.")
            else:
                print(f"Datei '{file}' enthält nicht die erforderlichen Spalten 'IstRad' und 'ULAND'.")
        
        except Exception as e:
            print(f"Fehler beim Verarbeiten der Datei '{file}': {e}")

# Hauptfunktion aufrufen
if __name__ == "__main__":
    # Pfad zum Verzeichnis mit den CSV-Dateien angeben
    directory = input("Gib den Pfad zum Verzeichnis mit den CSV-Dateien ein: ").strip()
    if os.path.isdir(directory):
        filter_csv_files(directory)
    else:
        print("Der angegebene Pfad ist kein gültiges Verzeichnis.")
