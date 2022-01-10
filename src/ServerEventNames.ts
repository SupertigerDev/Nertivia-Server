// connection events
export const CONNECT = "connect";
export const DISCONNECT = "disconnect";
export const RECONNECT_ATTEMPT = "reconnect_attempt";
export const AUTHENTICATED = "authenticated";
export const AUTHENTICATION_ERROR = "authentication_error";
// message events
export const MESSAGE_CREATED = "message:created";
export const MESSAGE_UPDATED = "message:updated";
export const MESSAGE_DELETED = "message:deleted";
export const MESSAGE_DELETED_BULK = "message:deleted_bulk";
// message reaction events
export const MESSAGE_REACTION_UPDATED = "message:reaction_updated";
// notification events
export const NOTIFICATION_DISMISSED = "notification:dismissed";
// channel events
export const CHANNEL_CREATED = "channel:created";
export const CHANNEL_DELETED = "channel:deleted";
export const CHANNEL_MUTED = "channel:muted";
export const CHANNEL_UNMUTED = "channel:unmuted";
// server channel events
export const SERVER_CHANNEL_CREATED = "server:channel_created";
export const SERVER_CHANNEL_DELETED = "server:channel_deleted";
export const SERVER_CHANNEL_UPDATED = "server:channel_updated";
export const SERVER_CHANNEL_POSITION_UPDATED = "server:channel_position_updated";
// server events
export const SERVER_POSITION_UPDATED = "server:position_updated";
export const SERVER_JOINED = "server:joined";
export const SERVER_UPDATED = "server:updated";
export const SERVER_LEFT = "server:left";
export const SERVER_MEMBER_ADDED = "server:member_added";
export const SERVER_MEMBER_REMOVED = "server:member_removed";
export const SERVER_MEMBERS = "server:members";
export const SERVER_ROLES = "server:roles";
export const SERVER_ROLES_UPDATED = "server:roles_updated";
export const SERVER_ROLE_CREATED = "server:role_created";
export const SERVER_ROLE_UPDATED = "server:role_updated";
export const SERVER_ROLE_DELETED = "server:role_deleted";

export const SERVER_ROLE_ADDED_TO_MEMBER = "server:role_added_to_member";
export const SERVER_ROLE_REMOVED_FROM_MEMBER = "server:role_removed_from_member";
export const SERVER_MUTED = "server:muted";
// user events
export const SELF_STATUS_CHANGE = "multiDeviceStatus";

export const USER_BLOCKED = "user:blocked";
export const USER_UNBLOCKED = "user:unblocked";

export const USER_TYPING = "user:typing";

export const SELF_CUSTOM_STATUS_CHANGE = "multiDeviceCustomStatus";
// call events
export const USER_CALL_JOINED = "user:call_joined";
export const USER_CALL_LEFT = "user:call_left";
export const VOICE_SIGNAL_RECEIVED = "voice:signal_received";
export const VOICE_RETURN_SIGNAL_RECEIVED = "voice:return_signal_received";

export const GOOGLE_DRIVE_LINKED = "google_drive:linked";
export const USER_STATUS_CHANGED = "user:status_changed";
export const USER_CUSTOM_STATUS_CHANGED = "user:custom_status_changed";
export const USER_PROGRAM_ACTIVITY_CHANGED = "user:program_activity_changed";
// relationship events
export const RELATIONSHIP_ADDED = "relationship:added";
export const RELATIONSHIP_DELETED = "relationship:deleted";
export const RELATIONSHIP_ACCEPTED = "relationship:accepted";
// custom emoji events
export const CUSTOM_EMOJI_RENAMED = "custom_emoji:renamed";
export const CUSTOM_EMOJI_UPLOADED = "custom_emoji:uploaded";
export const CUSTOM_EMOJI_DELETED = "custom_emoji:deleted";

// events that are currently not being used in the client
export const USER_UPDATED = "user:updated";

export const MESSAGE_BUTTON_CALLBACK = "message_button_click_callback";
export const MESSAGE_BUTTON_CLICKED = "message_button_clicked";
