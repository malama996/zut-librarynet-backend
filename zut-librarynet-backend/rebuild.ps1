# Rebuild script - compile updated Java files and update JAR

cd E:\zut-librarynet\zut-librarynet-backend

# Extract dependencies from existing JAR
Write-Host "Extracting JAR dependencies..."
jar xf target\librarynet.jar

# Find all JARs that were extracted
$cpJars = Get-ChildItem -Recurse -Filter "*.jar" | Select-Object -ExpandProperty FullName | ConvertTo-Csv -NoTypeInformation

# Build classpath - include all directories and target\classes
$classpath = "target\classes"
Get-ChildItem -Path "." -Filter "*.jar" -Recurse | ForEach-Object {
    $classpath += ";" + $_.FullName
}

Write-Host "Classpath: $classpath"

# Compile the two modified files
Write-Host "Recompiling LibraryHandlers.java..."
javac -encoding UTF-8 -d target\classes -cp $classpath `
    src\main\java\com\zut\librarynet\handlers\LibraryHandlers.java

Write-Host "Recompiling LibraryService.java..."
javac -encoding UTF-8 -d target\classes -cp $classpath `
    src\main\java\com\zut\librarynet\services\LibraryService.java

# Delete old JAR
Remove-Item target\librarynet.jar -Force -ErrorAction SilentlyContinue

# Extract original JAR to get META-INF/MANIFEST.MF
Write-Host "Extracting manifest from original JAR..."
If (Test-Path "target\original-librarynet.jar") {
    jar xf target\original-librarynet.jar META-INF/MANIFEST.MF
} Else {
    jar xf target\librarynet-1.0-SNAPSHOT.jar META-INF/MANIFEST.MF
}

# Recreate JAR from target/classes with manifest
Write-Host "Rebuilding JAR with manifest..."
cd target\classes
jar cfm ..\librarynet.jar ..\META-INF\MANIFEST.MF *
cd ..\..

Write-Host "Build complete! JAR ready at: target\librarynet.jar"
