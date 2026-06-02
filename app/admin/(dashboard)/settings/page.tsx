import SettingsClient from "./SettingsClient";

export default function SettingsPage() {
  return <SettingsClient mapsKey={process.env.GOOGLE_MAPS_API_KEY ?? ""} />;
}
