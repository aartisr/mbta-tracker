/**
 * Types for the web client
 * Mirrors server types with some additions for UI state
 */

export type {
	Vehicle,
	VehicleUpdate,
	RouteStopInfo,
	RouteStopsResponse,
	VehicleInfoResponse
} from '../../../../packages/transit-core/src/types';

export type QueryType = 'route' | 'stop' | 'address' | 'vehicle' | 'landmark' | 'unknown';

export interface SearchQuery {
	query_string: string;
	query_type: QueryType;
	filters?: {
		mode?: string;
		distance_km?: number;
	};
}

export type SearchResult = RouteResult | StopResult | VehicleResult | AddressResult | LandmarkResult;

export interface RouteResult {
	type: 'route';
	route_id: string;
	route_number: string;
	route_name: string;
	mode: 'bus' | 'subway' | 'rail' | 'ferry' | 'cable_car' | 'trolleybus';
	direction_names: string[];
	confidence: number;
	description?: string;
}

export interface StopResult {
	type: 'stop';
	stop_id: string;
	stop_name: string;
	stop_code?: string;
	latitude: number;
	longitude: number;
	accessibility_features?: string[];
	parent_stop_id?: string;
	confidence: number;
}

export interface AddressResult {
	type: 'address';
	address: string;
	latitude: number;
	longitude: number;
	nearby_stops: StopResult[];
	distance_km: number;
	confidence: number;
}

export interface VehicleResult {
	type: 'vehicle';
	vehicle_id: string;
	route_id: string;
	route_number: string;
	trip_id: string;
	headsign: string;
	current_stop_id?: string;
	next_stop_id?: string;
	latitude?: number;
	longitude?: number;
	confidence: number;
}

export interface LandmarkResult {
	type: 'landmark';
	landmark_name: string;
	latitude: number;
	longitude: number;
	nearby_stops: StopResult[];
	confidence: number;
}

export interface ArrivalForecast {
	trip_id: string;
	route_id: string;
	route_number: string;
	route_name: string;
	mode: string;
	direction: string;
	headsign: string;
	vehicle_id?: string;
	arrival_time: number;
	eta_seconds: number;
	scheduled_time: number;
	delay_seconds: number;
	is_live: boolean;
	platform?: string;
	accessibility_icons?: string[];
	crowding_percent?: number;
	occupancy_status?: string;
}

export interface StopArrivals {
	stop_id: string;
	stop_name: string;
	location: {
		latitude: number;
		longitude: number;
	};
	inbound: ArrivalForecast[];
	outbound: ArrivalForecast[];
	alerts?: Alert[];
	last_updated: number;
}

export interface Alert {
	id: string;
	effect: string;
	title: string;
	description: string;
	severity?: 'low' | 'medium' | 'high';
}

export interface SearchResponse {
	query: SearchQuery;
	results: SearchResult[];
	execution_time_ms: number;
	warning?: string;
}

export interface CrowdingForecastPoint {
	horizon_minutes: 5 | 15 | 30 | 60;
	occupancy_percent: number;
	confidence: number;
	sample_size: number;
}

export interface StopCrowdingForecastResponse {
	stop_id: string;
	stop_name: string;
	generated_at: number;
	timeline: CrowdingForecastPoint[];
}

export interface RouteCrowdingStopForecast {
	stop_id: string;
	stop_name: string;
	sequence: number;
	timeline: CrowdingForecastPoint[];
}

export interface RouteCrowdingForecastResponse {
	route_id: string;
	direction_id?: number;
	generated_at: number;
	stops: RouteCrowdingStopForecast[];
}

export interface BoardingSuggestionOption {
	option_type: 'best_overall' | 'fastest' | 'least_crowded';
	route_id: string;
	route_number: string;
	route_name: string;
	headsign: string;
	departure_stop_id: string;
	departure_stop_name: string;
	eta_minutes: number;
	crowding_percent: number;
	transfer_count: number;
	delay_minutes: number;
	score: number;
}

export interface BoardingSuggestionResponse {
	from_stop: {
		stop_id: string;
		stop_name: string;
	};
	to_stop: {
		stop_id: string;
		stop_name: string;
	};
	generated_at: number;
	options: BoardingSuggestionOption[];
}

export interface CommuteSummary {
	commute_id: string;
	label: string;
	from_stop_id: string;
	from_stop_name: string;
	to_stop_id: string;
	to_stop_name: string;
	typical_departure_time: string;
	trip_count: number;
	trend: 'faster' | 'stable' | 'slower';
}

export interface MyCommutesResponse {
	user_hash: string;
	generated_at: number;
	commutes: CommuteSummary[];
}

export interface CommuteRecommendationResponse {
	from_stop: {
		stop_id: string;
		stop_name: string;
	};
	to_stop: {
		stop_id: string;
		stop_name: string;
	};
	generated_at: number;
	recommended_departure_windows: string[];
	reason: string;
}

export interface EmergencyRerouteOption {
	route_id: string;
	route_number: string;
	route_name: string;
	departure_stop_id: string;
	departure_stop_name: string;
	eta_minutes: number;
	distance_increase_km: number;
	time_penalty_minutes: number;
	accessibility_support: 'full' | 'partial' | 'unknown';
	score: number;
}

export interface EmergencyRerouteResponse {
	from_stop: {
		stop_id: string;
		stop_name: string;
	};
	to_stop: {
		stop_id: string;
		stop_name: string;
	};
	disrupted_route: string;
	generated_at: number;
	alternatives: EmergencyRerouteOption[];
}

export interface PrivacyDashboardResponse {
	user_hash: string;
	opted_in: boolean;
	anonymize_after_days: number;
	stored_commute_count: number;
	generated_at: number;
}

export interface Mission {
	mission_id: string;
	name: string;
	description: string;
	category: 'exploration' | 'efficiency' | 'reliability' | 'community';
	reward_badge: string;
	difficulty: 'easy' | 'medium' | 'hard';
	is_weekly: boolean;
}

export interface MissionProgress {
	mission_id: string;
	status: 'available' | 'in_progress' | 'completed';
	progress_percent: number;
	started_at?: number;
	completed_at?: number;
}

export interface MissionsResponse {
	generated_at: number;
	current_week_theme: string;
	missions: Mission[];
	progress: MissionProgress[];
}

export interface LeaderboardEntry {
	rank: number;
	user_hash: string;
	points: number;
	completed_missions: number;
	badge_count: number;
}

export interface LeaderboardResponse {
	generated_at: number;
	timeframe: 'weekly' | 'all_time';
	top: LeaderboardEntry[];
	your_rank?: LeaderboardEntry;
	cache_ttl_seconds: number;
}

export interface MissionFeedbackItem {
	feedback_id: string;
	user_hash: string;
	suggested_mission: string;
	notes?: string;
	created_at: number;
}

export interface MissionFeedbackResponse {
	generated_at: number;
	total_feedback: number;
	recent_feedback: MissionFeedbackItem[];
}

export interface CommunityPost {
	post_id: string;
	user_hash: string;
	title: string;
	body: string;
	created_at: number;
}

export interface CommunityPostsResponse {
	generated_at: number;
	posts: CommunityPost[];
}
