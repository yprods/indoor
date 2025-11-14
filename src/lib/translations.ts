import type { Orientation } from "./places";

type UiStrings = {
  locale: string;
  appTitle: string;
  subtitle: string;
  searchPlaceholder: string;
  currentLocationLabel: string;
  selectLocationHint: string;
  surroundingHeading: string;
  directionsHeading: string;
  directionsUnavailable: string;
  totalDistanceLabel: string;
  distanceUnit: string;
  addLanguageLabel: string;
  languageCodeLabel: string;
  languageNameLabel: string;
  languageFormHelper: string;
  addLanguageSuccess: string;
  adminPanelLabel: string;
  showImagesLabel: string;
  hideImagesLabel: string;
  dashboardFilterLabel: string;
  dashboardAllLabel: string;
  openPanelLabel: string;
  closePanelLabel: string;
  showSearchLabel: string;
  hideSearchLabel: string;
  showQrLabel: string;
  hideQrLabel: string;
  showRouteLabel: string;
  hideRouteLabel: string;
  readDirectionsLabel: string;
  stopReadingLabel: string;
  ttsUnavailableLabel: string;
  quickTipsLabel: string;
  quickActionsOpenLabel: string;
  quickActionsCloseLabel: string;
  accessibilityLabel: string;
  accessibilityDescription: string;
  accessibilityModeOnLabel: string;
  accessibilityModeOffLabel: string;
  routePlayerTitle: string;
  routePlayerStepCounter: string;
  routePlayerPlay: string;
  routePlayerPause: string;
  routePlayerPrevious: string;
  routePlayerNext: string;
  routePlayerAutoLabel: string;
  routePlayerCloseLabel: string;
  routePlayerShowLabel: string;
  routePlayerHideLabel: string;
  shareTitle: string;
  shareDescription: string;
  shareUnavailable: string;
  wizardTitle: string;
  wizardSubtitle: string;
  wizardStepIndicator: string;
  wizardSearchPlaceholder: string;
  wizardGpsDetecting: string;
  wizardGpsDetected: string;
  wizardGpsDenied: string;
  wizardGpsUnsupported: string;
  wizardSuggestedLabel: string;
  wizardSelectedLabel: string;
  wizardSkipLabel: string;
  wizardNextLabel: string;
  wizardBackLabel: string;
  wizardStartNavigationLabel: string;
  wizardSkipDestinationLabel: string;
  wizardStartValidation: string;
  wizardDestinationValidation: string;
  themeToggleLabel: string;
  lightModeLabel: string;
  darkModeLabel: string;
  searchResultsHeading: string;
  clearSearch: string;
  mobileNavHint: string;
  sameLocation: string;
  noNearbyResults: string;
  noSearchResults: string;
  setAsCurrent: string;
  exploreHeading: string;
  mapViewHeading: string;
  zoomLevelLabel: string;
  zoomInLabel: string;
  zoomOutLabel: string;
  resetViewLabel: string;
  zoomSliderLabel: string;
  legendCurrent: string;
  legendSelected: string;
  legendNearby: string;
  placeInfoFloor: string;
  placeInfoZone: string;
  placeInfoType: string;
  loadingDirections: string;
  noMapData: string;
  legendHeading: string;
  directionStep: string;
  directionStepWithLandmark: string;
  orientationLabels: Record<Orientation, string>;
};

type DirectionParams = {
  destination: string;
  distance: number;
  orientation: Orientation;
  landmark?: string;
};

const orientationLabels: Record<string, Record<Orientation, string>> = {
  he: {
    north: "צפון",
    south: "דרום",
    east: "מזרח",
    west: "מערב",
    up: "למעלה",
    down: "למטה",
  },
  en: {
    north: "north",
    south: "south",
    east: "east",
    west: "west",
    up: "up",
    down: "down",
  },
  es: {
    north: "norte",
    south: "sur",
    east: "este",
    west: "oeste",
    up: "arriba",
    down: "abajo",
  },
  fr: {
    north: "nord",
    south: "sud",
    east: "est",
    west: "ouest",
    up: "haut",
    down: "bas",
  },
};

const baseStrings: UiStrings = {
  locale: "he",
  appTitle: "ניווט פנימי",
  subtitle: "תכננו מסלול והכירו את המבנה בביטחון מלא.",
  searchPlaceholder: "חיפוש חדרים, שירותים או עמדות",
  currentLocationLabel: "המיקום הנוכחי",
  selectLocationHint: "בחרו את המיקום שלכם כדי לראות נקודות עניין סביבכם.",
  surroundingHeading: "סביבך עכשיו",
  directionsHeading: "הנחיות ניווט",
  directionsUnavailable: "לא נמצאו הנחיות בין נקודות אלו.",
  totalDistanceLabel: "מרחק כולל",
  distanceUnit: "מ'",
  addLanguageLabel: "הוספת שפה",
  languageCodeLabel: "קוד שפה",
  languageNameLabel: "שם השפה",
  languageFormHelper: "השתמשו בקודים מסוג ISO כמו 'de' לגרמנית או 'pt-BR' לפורטוגזית ברזילאית.",
  addLanguageSuccess: "השפה נוספה בהצלחה.",
  adminPanelLabel: "ממשק ניהול",
  showImagesLabel: "הצגת תמונות",
  hideImagesLabel: "הסתרת תמונות",
  dashboardFilterLabel: "בחירת תצוגה",
  dashboardAllLabel: "כל האזורים",
  openPanelLabel: "פתיחת לוח הבקרה",
  closePanelLabel: "סגירת לוח הבקרה",
  showSearchLabel: "הצגת חיפוש",
  hideSearchLabel: "הסתרת חיפוש",
  showQrLabel: "הצגת קוד QR",
  hideQrLabel: "הסתרת קוד QR",
  showRouteLabel: "הצג מסלול",
  hideRouteLabel: "הסתר מסלול",
  readDirectionsLabel: "הקרא",
  stopReadingLabel: "עצור קריאה",
  ttsUnavailableLabel: "הקראה קולית אינה נתמכת בדפדפן זה.",
  quickActionsOpenLabel: "פתיחת תפריט",
  quickActionsCloseLabel: "סגירת תפריט",
  accessibilityLabel: "נגישות",
  accessibilityDescription: "שפרו את הקריאות והפחיתו עומס חזותי במצב נגישות.",
  accessibilityModeOnLabel: "הפעלת מצב נגישות",
  accessibilityModeOffLabel: "כיבוי מצב נגישות",
  routePlayerTitle: "מסלול לפי שלבים",
  routePlayerStepCounter: "שלב {current} מתוך {total}",
  routePlayerPlay: "נגן",
  routePlayerPause: "עצור",
  routePlayerPrevious: "קודם",
  routePlayerNext: "הבא",
  routePlayerAutoLabel: "הפעלה אוטומטית",
  routePlayerCloseLabel: "סגירת ההוראות",
  routePlayerShowLabel: "הצגת ההוראות",
  routePlayerHideLabel: "הסתרת ההוראות",
  shareTitle: "שיתוף במכשיר נייד",
  shareDescription: "סרקו את הקוד כדי לפתוח את הניווט במכשיר הטלפון שלכם.",
  shareUnavailable: "לא ניתן ליצור קוד QR כרגע.",
  wizardTitle: "מתחילים ניווט",
  wizardSubtitle: "נתאים עבורכם את המסלול – ספרו לנו איפה אתם ומה היעד.",
  wizardStepIndicator: "שלב {current} מתוך {total}",
  wizardSearchPlaceholder: "חפשו לפי שם, אזור או קומה",
  wizardGpsDetecting: "בודקים מיקום GPS…",
  wizardGpsDetected: "זוהה מיקום GPS: {coordinates}.",
  wizardGpsDenied: "לא הצלחנו לקבל הרשאה ל-GPS. תוכלו לבחור ידנית.",
  wizardGpsUnsupported: "דפדפן זה לא תומך ב-GPS. בחרו מיקום ידנית.",
  wizardSuggestedLabel: "המלצה",
  wizardSelectedLabel: "נבחר",
  wizardSkipLabel: "דלגו על ההדרכה",
  wizardNextLabel: "המשך",
  wizardBackLabel: "חזרה",
  wizardStartNavigationLabel: "התחילו ניווט",
  wizardSkipDestinationLabel: "דלג על בחירת יעד",
  wizardStartValidation: "אנא בחרו מיקום התחלתי.",
  wizardDestinationValidation: "בחרו יעד או דלגו על השלב הזה.",
  themeToggleLabel: "מצב תצוגה",
  lightModeLabel: "מצב בהיר",
  darkModeLabel: "מצב כהה",
  searchResultsHeading: "תוצאות",
  clearSearch: "ניקוי",
  mobileNavHint: "במובייל עברו בין התצוגות באמצעות כרטיסיות הפעולות המהירות.",
  quickTipsLabel: "פתחו את תפריט הפעולות כדי לשלוט בפאנלים, בתמונות ובשיתוף המפה.",
  sameLocation: "אתם כבר נמצאים במקום שבחרתם.",
  noNearbyResults: "עדיין אין נקודות קרובות.",
  noSearchResults: "לא נמצאו תוצאות מתאימות.",
  setAsCurrent: "קבע כמיקום",
  exploreHeading: "חקירת המרחב",
  mapViewHeading: "תצוגת המפה",
  zoomLevelLabel: "זום נוכחי",
  zoomInLabel: "התקרב",
  zoomOutLabel: "התרחק",
  resetViewLabel: "איפוס תצוגה",
  zoomSliderLabel: "שליטת זום",
  legendCurrent: "אתם",
  legendSelected: "יעד נבחר",
  legendNearby: "סביבך",
  placeInfoFloor: "קומה",
  placeInfoZone: "אזור",
  placeInfoType: "סוג",
  loadingDirections: "טוען מסלול…",
  noMapData: "אין נתוני מפה",
  legendHeading: "מקרא מפה",
  directionStep: "צעדו {{distance}} {{unit}} לכיוון {{orientation}} כדי להגיע אל {{destination}}.",
  directionStepWithLandmark:
    "צעדו {{distance}} {{unit}} לכיוון {{orientation}}, חלפו ליד {{landmark}}, כדי להגיע אל {{destination}}.",
  orientationLabels: orientationLabels.he,
};

const localeOverrides: Partial<Record<string, Partial<UiStrings>>> = {
  en: {
    locale: "en",
    appTitle: "Indoor Navigator",
    subtitle: "Plan your route and explore the building confidently.",
    searchPlaceholder: "Search for rooms, services, or amenities",
    currentLocationLabel: "Current location",
    selectLocationHint: "Select your current location to explore nearby points of interest.",
    surroundingHeading: "Around you",
    directionsHeading: "Directions",
    directionsUnavailable: "Directions unavailable between these locations.",
    totalDistanceLabel: "Total distance",
    distanceUnit: "m",
    addLanguageLabel: "Add language",
    languageCodeLabel: "Language code",
    languageNameLabel: "Language name",
    languageFormHelper: "Use ISO codes like 'de' for German or 'pt-BR' for Brazilian Portuguese.",
    addLanguageSuccess: "Language added successfully.",
    adminPanelLabel: "Admin panel",
    showImagesLabel: "Show images",
    hideImagesLabel: "Hide images",
    dashboardFilterLabel: "Choose dashboard",
    dashboardAllLabel: "All areas",
    openPanelLabel: "Open details",
    closePanelLabel: "Close details",
    showSearchLabel: "Show search",
    hideSearchLabel: "Hide search",
    showQrLabel: "Show QR code",
    hideQrLabel: "Hide QR code",
    showRouteLabel: "Show route",
    hideRouteLabel: "Hide route",
    readDirectionsLabel: "Read directions",
    stopReadingLabel: "Stop reading",
    ttsUnavailableLabel: "Text-to-speech is not available in this browser.",
    quickActionsOpenLabel: "Open actions menu",
    quickActionsCloseLabel: "Close actions menu",
    accessibilityLabel: "Accessibility",
    accessibilityDescription: "Make the interface larger with higher contrast for easier reading.",
    accessibilityModeOnLabel: "Enable accessibility mode",
    accessibilityModeOffLabel: "Disable accessibility mode",
    routePlayerTitle: "Step-by-step route",
    routePlayerStepCounter: "Step {current} of {total}",
    routePlayerPlay: "Play",
    routePlayerPause: "Pause",
    routePlayerPrevious: "Prev",
    routePlayerNext: "Next",
    routePlayerAutoLabel: "Auto-play",
    routePlayerCloseLabel: "Close directions",
    routePlayerShowLabel: "Show directions",
    routePlayerHideLabel: "Hide directions",
    shareTitle: "Share to your phone",
    shareDescription: "Scan the code to open the indoor navigator on your phone.",
    shareUnavailable: "Unable to generate a QR code right now.",
    wizardTitle: "Let’s get you oriented",
    wizardSubtitle: "Tell us where you are and where you’d like to go.",
    wizardStepIndicator: "Step {current} of {total}",
    wizardSearchPlaceholder: "Search by name, area, or floor",
    wizardGpsDetecting: "Checking GPS location…",
    wizardGpsDetected: "GPS position detected: {coordinates}.",
    wizardGpsDenied: "We couldn't access GPS. Please choose your location manually.",
    wizardGpsUnsupported: "GPS is not supported in this browser. Choose your location manually.",
    wizardSuggestedLabel: "Suggested",
    wizardSelectedLabel: "Selected",
    wizardSkipLabel: "Skip intro",
    wizardNextLabel: "Next",
    wizardBackLabel: "Back",
    wizardStartNavigationLabel: "Start navigation",
    wizardSkipDestinationLabel: "Skip destination",
    wizardStartValidation: "Please choose where you are.",
    wizardDestinationValidation: "Please choose a destination or skip this step.",
    themeToggleLabel: "Display mode",
    lightModeLabel: "Light mode",
    darkModeLabel: "Dark mode",
    searchResultsHeading: "Results",
    clearSearch: "Clear",
    mobileNavHint: "Use quick actions to switch views on mobile.",
    quickTipsLabel: "Open the actions menu to control panels, imagery, sharing, and more.",
    sameLocation: "You are already at this location.",
    noNearbyResults: "No nearby destinations yet.",
    noSearchResults: "No matching results yet.",
    setAsCurrent: "Set as current",
    exploreHeading: "Explore the space",
    mapViewHeading: "Map view",
    zoomLevelLabel: "Zoom",
    zoomInLabel: "Zoom in",
    zoomOutLabel: "Zoom out",
    resetViewLabel: "Reset view",
    zoomSliderLabel: "Zoom level slider",
    legendCurrent: "You",
    legendSelected: "Selected",
    legendNearby: "Nearby",
    placeInfoFloor: "Floor",
    placeInfoZone: "Zone",
    placeInfoType: "Type",
    loadingDirections: "Loading route…",
    noMapData: "No map data",
    legendHeading: "Map legend",
    directionStep: "Walk {{distance}} {{unit}} {{orientation}} to reach {{destination}}.",
    directionStepWithLandmark:
      "Walk {{distance}} {{unit}} {{orientation}}, passing {{landmark}}, to reach {{destination}}.",
    orientationLabels: orientationLabels.en,
  },
  es: {
    locale: "es",
    appTitle: "Navegador Interior",
    subtitle: "Planifica tu ruta y explora el edificio con confianza.",
    searchPlaceholder: "Busca salas, servicios o amenidades",
    currentLocationLabel: "Ubicación actual",
    selectLocationHint: "Selecciona dónde estás para descubrir puntos de interés cercanos.",
    surroundingHeading: "A tu alrededor",
    directionsHeading: "Indicaciones",
    directionsUnavailable: "No hay ruta disponible entre estos puntos.",
    totalDistanceLabel: "Distancia total",
    distanceUnit: "m",
    addLanguageLabel: "Agregar idioma",
    languageCodeLabel: "Código de idioma",
    languageNameLabel: "Nombre del idioma",
    languageFormHelper: "Usa códigos ISO como 'de' para alemán o 'pt-BR' para portugués brasileño.",
    addLanguageSuccess: "Idioma agregado correctamente.",
    adminPanelLabel: "Panel de administración",
    showImagesLabel: "Mostrar imágenes",
    hideImagesLabel: "Ocultar imágenes",
    dashboardFilterLabel: "Elegir tablero",
    dashboardAllLabel: "Todas las áreas",
    openPanelLabel: "Abrir panel",
    closePanelLabel: "Cerrar panel",
    showSearchLabel: "Mostrar búsqueda",
    hideSearchLabel: "Ocultar búsqueda",
    showQrLabel: "Mostrar código QR",
    hideQrLabel: "Ocultar código QR",
    showRouteLabel: "Mostrar ruta",
    hideRouteLabel: "Ocultar ruta",
    readDirectionsLabel: "Leer indicaciones",
    stopReadingLabel: "Detener lectura",
    ttsUnavailableLabel: "La síntesis de voz no está disponible en este navegador.",
    quickActionsOpenLabel: "Abrir menú de acciones",
    quickActionsCloseLabel: "Cerrar menú de acciones",
    accessibilityLabel: "Accesibilidad",
    accessibilityDescription: "Haz la interfaz más grande y con mayor contraste para facilitar la lectura.",
    accessibilityModeOnLabel: "Activar modo de accesibilidad",
    accessibilityModeOffLabel: "Desactivar modo de accesibilidad",
    routePlayerTitle: "Ruta paso a paso",
    routePlayerStepCounter: "Paso {current} de {total}",
    routePlayerPlay: "Reproducir",
    routePlayerPause: "Pausa",
    routePlayerPrevious: "Anterior",
    routePlayerNext: "Siguiente",
    routePlayerAutoLabel: "Reproducción automática",
    routePlayerCloseLabel: "Cerrar indicaciones",
    routePlayerShowLabel: "Mostrar indicaciones",
    routePlayerHideLabel: "Ocultar indicaciones",
    shareTitle: "Compartir en tu teléfono",
    shareDescription: "Escanea el código para abrir el navegador interior en tu móvil.",
    shareUnavailable: "No se pudo generar un código QR en este momento.",
    wizardTitle: "Configura tu recorrido",
    wizardSubtitle: "Cuéntanos dónde estás y a dónde deseas ir.",
    wizardStepIndicator: "Paso {current} de {total}",
    wizardSearchPlaceholder: "Busca por nombre, zona o planta",
    wizardGpsDetecting: "Comprobando la ubicación GPS…",
    wizardGpsDetected: "Ubicación GPS detectada: {coordinates}.",
    wizardGpsDenied: "No pudimos acceder al GPS. Selecciona tu ubicación manualmente.",
    wizardGpsUnsupported: "El GPS no está disponible en este navegador. Selecciona tu ubicación manualmente.",
    wizardSuggestedLabel: "Sugerido",
    wizardSelectedLabel: "Seleccionado",
    wizardSkipLabel: "Omitir guía",
    wizardNextLabel: "Siguiente",
    wizardBackLabel: "Atrás",
    wizardStartNavigationLabel: "Iniciar navegación",
    wizardSkipDestinationLabel: "Omitir destino",
    wizardStartValidation: "Selecciona tu ubicación actual.",
    wizardDestinationValidation: "Selecciona un destino o omite este paso.",
    themeToggleLabel: "Modo de visualización",
    lightModeLabel: "Modo claro",
    darkModeLabel: "Modo oscuro",
    searchResultsHeading: "Resultados",
    clearSearch: "Limpiar",
    mobileNavHint: "Usa las acciones rápidas para cambiar de vista en el móvil.",
    quickTipsLabel: "Abre el menú de acciones para controlar paneles, imágenes y compartir el mapa.",
    sameLocation: "Ya estás en este lugar.",
    noNearbyResults: "No hay destinos cercanos por ahora.",
    noSearchResults: "No se encontraron resultados.",
    setAsCurrent: "Definir como actual",
    exploreHeading: "Explora el espacio",
    mapViewHeading: "Vista del mapa",
    zoomLevelLabel: "Zoom",
    zoomInLabel: "Acercar",
    zoomOutLabel: "Alejar",
    resetViewLabel: "Restablecer vista",
    zoomSliderLabel: "Control de zoom",
    legendCurrent: "Tú",
    legendSelected: "Destino",
    legendNearby: "Cercanos",
    placeInfoFloor: "Piso",
    placeInfoZone: "Zona",
    placeInfoType: "Tipo",
    loadingDirections: "Calculando ruta…",
    noMapData: "Sin mapa disponible",
    legendHeading: "Leyenda del mapa",
    directionStep: "Camina {{distance}} {{unit}} hacia el {{orientation}} para llegar a {{destination}}.",
    directionStepWithLandmark:
      "Camina {{distance}} {{unit}} hacia el {{orientation}}, pasando por {{landmark}}, para llegar a {{destination}}.",
    orientationLabels: orientationLabels.es,
  },
  fr: {
    locale: "fr",
    appTitle: "Navigateur Intérieur",
    subtitle: "Planifiez votre trajet et explorez le bâtiment sereinement.",
    searchPlaceholder: "Recherchez salles, services ou espaces",
    currentLocationLabel: "Position actuelle",
    selectLocationHint: "Choisissez votre position pour explorer les lieux à proximité.",
    surroundingHeading: "Autour de vous",
    directionsHeading: "Itinéraire",
    directionsUnavailable: "Aucun trajet disponible entre ces lieux.",
    totalDistanceLabel: "Distance totale",
    distanceUnit: "m",
    addLanguageLabel: "Ajouter une langue",
    languageCodeLabel: "Code langue",
    languageNameLabel: "Nom de la langue",
    languageFormHelper: "Utilisez des codes ISO, par exemple 'de' pour allemand ou 'pt-BR' pour portugais brésilien.",
    addLanguageSuccess: "Langue ajoutée avec succès.",
    adminPanelLabel: "Panneau d’administration",
    showImagesLabel: "Afficher les images",
    hideImagesLabel: "Masquer les images",
    dashboardFilterLabel: "Choisir un tableau",
    dashboardAllLabel: "Tous les espaces",
    openPanelLabel: "Ouvrir le panneau",
    closePanelLabel: "Fermer le panneau",
    showSearchLabel: "Afficher la recherche",
    hideSearchLabel: "Masquer la recherche",
    showQrLabel: "Afficher le QR code",
    hideQrLabel: "Masquer le QR code",
    showRouteLabel: "Afficher l’itinéraire",
    hideRouteLabel: "Masquer l’itinéraire",
    readDirectionsLabel: "Lire les instructions",
    stopReadingLabel: "Arrêter la lecture",
    ttsUnavailableLabel: "La synthèse vocale n’est pas disponible sur ce navigateur.",
    quickActionsOpenLabel: "Ouvrir le menu d’actions",
    quickActionsCloseLabel: "Fermer le menu d’actions",
    accessibilityLabel: "Accessibilité",
    accessibilityDescription: "Agrandissez l’interface et augmentez le contraste pour faciliter la lecture.",
    accessibilityModeOnLabel: "Activer le mode accessibilité",
    accessibilityModeOffLabel: "Désactiver le mode accessibilité",
    routePlayerTitle: "Itinéraire étape par étape",
    routePlayerStepCounter: "Étape {current} sur {total}",
    routePlayerPlay: "Lecture",
    routePlayerPause: "Pause",
    routePlayerPrevious: "Précédent",
    routePlayerNext: "Suivant",
    routePlayerAutoLabel: "Lecture auto",
    routePlayerCloseLabel: "Fermer les instructions",
    routePlayerShowLabel: "Afficher les instructions",
    routePlayerHideLabel: "Masquer les instructions",
    shareTitle: "Partager sur votre téléphone",
    shareDescription: "Scannez le code pour ouvrir le guide de navigation intérieure sur votre mobile.",
    shareUnavailable: "Impossible de générer un code QR pour le moment.",
    wizardTitle: "Préparons votre trajet",
    wizardSubtitle: "Indiquez-nous où vous êtes et où vous souhaitez aller.",
    wizardStepIndicator: "Étape {current} sur {total}",
    wizardSearchPlaceholder: "Rechercher par nom, zone ou étage",
    wizardGpsDetecting: "Vérification de la position GPS…",
    wizardGpsDetected: "Position GPS détectée : {coordinates}.",
    wizardGpsDenied: "Impossible d’accéder au GPS. Choisissez votre emplacement manuellement.",
    wizardGpsUnsupported: "Le GPS n’est pas pris en charge par ce navigateur. Choisissez votre emplacement manuellement.",
    wizardSuggestedLabel: "Suggéré",
    wizardSelectedLabel: "Sélectionné",
    wizardSkipLabel: "Passer",
    wizardNextLabel: "Suivant",
    wizardBackLabel: "Retour",
    wizardStartNavigationLabel: "Lancer la navigation",
    wizardSkipDestinationLabel: "Passer la sélection du point d’arrivée",
    wizardStartValidation: "Veuillez sélectionner votre position de départ.",
    wizardDestinationValidation: "Sélectionnez une destination ou passez cette étape.",
    themeToggleLabel: "Mode d’affichage",
    lightModeLabel: "Mode clair",
    darkModeLabel: "Mode sombre",
    searchResultsHeading: "Résultats",
    clearSearch: "Effacer",
    mobileNavHint: "Utilisez les actions rapides pour changer de vue sur mobile.",
    quickTipsLabel: "Ouvrez le menu d’actions pour gérer panneaux, visuels et partage de la carte.",
    sameLocation: "Vous êtes déjà à cet endroit.",
    noNearbyResults: "Aucune destination à proximité pour le moment.",
    noSearchResults: "Aucun résultat correspondant.",
    setAsCurrent: "Définir comme position",
    exploreHeading: "Explorer l’espace",
    mapViewHeading: "Vue de la carte",
    zoomLevelLabel: "Zoom",
    zoomInLabel: "Zoom avant",
    zoomOutLabel: "Zoom arrière",
    resetViewLabel: "Réinitialiser la vue",
    zoomSliderLabel: "Curseur de zoom",
    legendCurrent: "Vous",
    legendSelected: "Destination",
    legendNearby: "À proximité",
    placeInfoFloor: "Étage",
    placeInfoZone: "Zone",
    placeInfoType: "Type",
    loadingDirections: "Calcul de l’itinéraire…",
    noMapData: "Pas de carte",
    legendHeading: "Légende de la carte",
    directionStep: "Marchez {{distance}} {{unit}} vers le {{orientation}} pour atteindre {{destination}}.",
    directionStepWithLandmark:
      "Marchez {{distance}} {{unit}} vers le {{orientation}}, en passant par {{landmark}}, pour atteindre {{destination}}.",
    orientationLabels: orientationLabels.fr,
  },
};

export function getUiStrings(locale: string): UiStrings {
  const normalized = locale.toLowerCase();
  const overrides = localeOverrides[normalized];
  const strings = {
    ...baseStrings,
    ...(overrides ?? {}),
  };

  return {
    ...strings,
    orientationLabels: orientationLabels[normalized] ?? orientationLabels.en,
  };
}

export function getOrientationLabel(locale: string, orientation: Orientation) {
  const normalized = locale.toLowerCase();
  const labels = orientationLabels[normalized] ?? orientationLabels.en;
  return labels[orientation] ?? orientationLabels.en[orientation];
}

export function formatDirectionStep(locale: string, params: DirectionParams) {
  const strings = getUiStrings(locale);
  const orientationLabel = getOrientationLabel(locale, params.orientation);
  const formatNumber = new Intl.NumberFormat(locale, { maximumFractionDigits: 0 });
  const distanceValue = formatNumber.format(params.distance);
  const template = params.landmark ? strings.directionStepWithLandmark : strings.directionStep;

  return template
    .replace("{{distance}}", distanceValue)
    .replace("{{unit}}", strings.distanceUnit)
    .replace("{{orientation}}", orientationLabel)
    .replace("{{landmark}}", params.landmark ?? "")
    .replace("{{destination}}", params.destination);
}

