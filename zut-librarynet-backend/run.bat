@echo off
REM Run ZUT LibraryNet API
REM This script compiles and runs the application

echo Building ZUT LibraryNet API...
cd /d e:\zut-librarynet\zut-librarynet-backend

REM Try to find Maven
for /f "delims=" %%i in ('where mvn 2^>nul') do set MVN_CMD=%%i

if not defined MVN_CMD (
    echo Maven not found in PATH. Attempting to use system javac...
    REM Try using Java directly with compiled classes
    echo Compiling Java files...
    javac -d target\classes -cp "src\main\java" "src\main\java\com\zut\librarynet\*.java" 2>nul
    if errorlevel 1 (
        echo Failed to compile. Please ensure Java Development Kit ^(JDK 17 or higher^) is installed.
        pause
        exit /b 1
    )
    echo Starting application...
    java -cp target\classes com.zut.librarynet.Main
) else (
    echo Found Maven at: %MVN_CMD%
    echo Building and running with Maven...
    mvn clean package -DskipTests && java -jar target\librarynet-1.0-SNAPSHOT.jar
)

pause
