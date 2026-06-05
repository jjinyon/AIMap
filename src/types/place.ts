export type PlaceCategory =
  | "food"
  | "cafe"
  | "culture"
  | "heritage"
  | "museum"
  | "park"
  | "beach"
  | "market"
  | "attraction"
  | "temple"
  | "architecture"
  | "shopping"
  | "convenience"
  | "bank"
  | "parking"
  | "pharmacy"
  | "hotel"
  | "photo_spot"
  | "unknown";

export type IndoorOutdoor = "indoor" | "outdoor" | "mixed";

export type WeatherCondition = "clear" | "clouds" | "rain" | "snow" | "hot" | "cold" | "wind";

export type TravelPreferenceTag =
  | "indoor"
  | "outdoor"
  | "rest"
  | "activity"
  | "historical"
  | "modern";

export interface Place {
  id: string;
  name: string;
  category: PlaceCategory;
  address: string;
  lat: number;
  lng: number;
  rating: number;
  reviewCount: number;
  tags: TravelPreferenceTag[];
  localReviewCount: number;
  isLocalWithin7km: boolean;
  culturalValue: number;
  storyAvailable: boolean;
  estimatedStayTime: number;
  weatherSuitable: WeatherCondition[];
  indoorOutdoor: IndoorOutdoor;

  kakaoPlaceId?: string;
  kakaoCategoryCode?: string;
  kakaoCategoryName?: string;
  kakaoCategoryPath?: string;
  roadAddress?: string;
  phone?: string;
  placeUrl?: string;
  distanceKm?: number;

  routeWeight?: number;
  routeRole?: "main_stop" | "short_stop" | "meal" | "rest" | "destination";
  audioStoryHint?: string;
}

export interface KakaoPlaceResponse {
  id: string;
  place_name: string;
  category_group_code?: string;
  category_group_name?: string;
  category_name?: string;
  address_name?: string;
  road_address_name?: string;
  x: string;
  y: string;
  phone?: string;
  place_url?: string;
  distance?: string;
}

export function mapKakaoPlaceToPlace(kakaoPlace: KakaoPlaceResponse): Place {
  const category = mapKakaoCategory(kakaoPlace.category_group_code, kakaoPlace.category_name);

  return {
    id: `kakao-${kakaoPlace.id}`,
    kakaoPlaceId: kakaoPlace.id,
    name: kakaoPlace.place_name,
    category,
    address: kakaoPlace.road_address_name || kakaoPlace.address_name || "",
    roadAddress: kakaoPlace.road_address_name,
    lat: Number(kakaoPlace.y),
    lng: Number(kakaoPlace.x),
    rating: 0,
    reviewCount: 0,
    tags: [],
    localReviewCount: 0,
    isLocalWithin7km: false,
    culturalValue: 0,
    storyAvailable: false,
    estimatedStayTime: 30,
    weatherSuitable: ["clear", "clouds"],
    indoorOutdoor: "mixed",
    kakaoCategoryCode: kakaoPlace.category_group_code,
    kakaoCategoryName: kakaoPlace.category_group_name,
    kakaoCategoryPath: kakaoPlace.category_name,
    phone: kakaoPlace.phone,
    placeUrl: kakaoPlace.place_url,
    distanceKm: kakaoPlace.distance ? Number(kakaoPlace.distance) / 1000 : undefined,
  };
}

function mapKakaoCategory(categoryCode = "", categoryPath = ""): PlaceCategory {
  const text = `${categoryCode} ${categoryPath}`;

  if (/미술관|박물관/.test(text)) return "museum";
  if (/해수욕장|해변|바다/.test(text)) return "beach";
  if (/사찰|절|불교|temple/i.test(text)) return "temple";
  if (/건축|건물|architecture/i.test(text)) return "architecture";
  if (/유적|역사|기념|전통/.test(text)) return "heritage";
  if (/시장|전통시장/.test(text)) return "market";
  if (/FD6|음식|식당|한식|일식|중식|양식/.test(text)) return "food";
  if (/CE7|카페|커피|디저트/.test(text)) return "cafe";
  if (/CS2|편의점/.test(text)) return "convenience";
  if (/BK9|은행/.test(text)) return "bank";
  if (/PKG|주차장|parking/i.test(text)) return "parking";
  if (/PM9|약국/.test(text)) return "pharmacy";
  if (/AD5|호텔|숙박/.test(text)) return "hotel";
  if (/CT1|문화|공연|전시|영화/.test(text)) return "culture";
  if (/AT4|관광|명소|전망|아쿠아리움/.test(text)) return "attraction";
  if (/PK6|공원/.test(text)) return "park";
  if (/MT1|쇼핑|상가/.test(text)) return "shopping";

  return "unknown";
}
