/**
 * VeloX Time Travel - Comprehensive IANA Timezones Dataset (ES5 Compatible)
 */
(function (root) {
  "use strict";

  root.VeloX = root.VeloX || {};

  var POPULAR_TIMEZONES = [
    { id: "", name: "Browser System Default", group: "System" },
    { id: "UTC", name: "UTC (Coordinated Universal Time)", group: "Universal" },
    { id: "America/New_York", name: "New York (EST/EDT, UTC-5/-4)", group: "Americas" },
    { id: "America/Chicago", name: "Chicago (CST/CDT, UTC-6/-5)", group: "Americas" },
    { id: "America/Denver", name: "Denver (MST/MDT, UTC-7/-6)", group: "Americas" },
    { id: "America/Los_Angeles", name: "Los Angeles (PST/PDT, UTC-8/-7)", group: "Americas" },
    { id: "America/Toronto", name: "Toronto (EST/EDT, UTC-5/-4)", group: "Americas" },
    { id: "America/Sao_Paulo", name: "São Paulo (BRT, UTC-3)", group: "Americas" },
    { id: "Europe/London", name: "London (GMT/BST, UTC+0/+1)", group: "Europe" },
    { id: "Europe/Paris", name: "Paris / Berlin / Rome (CET/CEST, UTC+1/+2)", group: "Europe" },
    { id: "Europe/Amsterdam", name: "Amsterdam (CET/CEST, UTC+1/+2)", group: "Europe" },
    { id: "Europe/Moscow", name: "Moscow (MSK, UTC+3)", group: "Europe" },
    { id: "Asia/Dubai", name: "Dubai (GST, UTC+4)", group: "Middle East" },
    { id: "Asia/Kolkata", name: "India / Mumbai / Bengaluru (IST, UTC+5:30)", group: "Asia" },
    { id: "Asia/Singapore", name: "Singapore (SGT, UTC+8)", group: "Asia" },
    { id: "Asia/Hong_Kong", name: "Hong Kong (HKT, UTC+8)", group: "Asia" },
    { id: "Asia/Shanghai", name: "Beijing / Shanghai (CST, UTC+8)", group: "Asia" },
    { id: "Asia/Tokyo", name: "Tokyo (JST, UTC+9)", group: "Asia" },
    { id: "Asia/Seoul", name: "Seoul (KST, UTC+9)", group: "Asia" },
    { id: "Australia/Sydney", name: "Sydney / Melbourne (AEST/AEDT, UTC+10/+11)", group: "Pacific" },
    { id: "Pacific/Auckland", name: "Auckland / Wellington (NZST/NZDT, UTC+12/+13)", group: "Pacific" }
  ];

  var EXTENDED_TIMEZONES = [
    { id: "Africa/Cairo", name: "Cairo (EET, UTC+2)", group: "Africa" },
    { id: "Africa/Johannesburg", name: "Johannesburg (SAST, UTC+2)", group: "Africa" },
    { id: "Africa/Lagos", name: "Lagos (WAT, UTC+1)", group: "Africa" },
    { id: "Africa/Nairobi", name: "Nairobi (EAT, UTC+3)", group: "Africa" },
    { id: "America/Anchorage", name: "Anchorage (AKST/AKDT, UTC-9/-8)", group: "Americas" },
    { id: "America/Argentina/Buenos_Aires", name: "Buenos Aires (ART, UTC-3)", group: "Americas" },
    { id: "America/Bogota", name: "Bogota (COT, UTC-5)", group: "Americas" },
    { id: "America/Halifax", name: "Halifax (AST/ADT, UTC-4/-3)", group: "Americas" },
    { id: "America/Lima", name: "Lima (PET, UTC-5)", group: "Americas" },
    { id: "America/Mexico_City", name: "Mexico City (CST, UTC-6)", group: "Americas" },
    { id: "America/Phoenix", name: "Phoenix (MST, UTC-7)", group: "Americas" },
    { id: "America/Santiago", name: "Santiago (CLT/CLST, UTC-4/-3)", group: "Americas" },
    { id: "America/Vancouver", name: "Vancouver (PST/PDT, UTC-8/-7)", group: "Americas" },
    { id: "Asia/Bangkok", name: "Bangkok / Jakarta (ICT, UTC+7)", group: "Asia" },
    { id: "Asia/Dhaka", name: "Dhaka (BST, UTC+6)", group: "Asia" },
    { id: "Asia/Jerusalem", name: "Jerusalem (IST/IDT, UTC+2/+3)", group: "Middle East" },
    { id: "Asia/Karachi", name: "Karachi (PKT, UTC+5)", group: "Asia" },
    { id: "Asia/Kathmandu", name: "Kathmandu (NPT, UTC+5:45)", group: "Asia" },
    { id: "Asia/Manila", name: "Manila (PHT, UTC+8)", group: "Asia" },
    { id: "Asia/Riyadh", name: "Riyadh (AST, UTC+3)", group: "Middle East" },
    { id: "Asia/Taipei", name: "Taipei (CST, UTC+8)", group: "Asia" },
    { id: "Atlantic/Reykjavik", name: "Reykjavik (GMT, UTC+0)", group: "Europe" },
    { id: "Australia/Adelaide", name: "Adelaide (ACST/ACDT, UTC+9:30/+10:30)", group: "Pacific" },
    { id: "Australia/Brisbane", name: "Brisbane (AEST, UTC+10)", group: "Pacific" },
    { id: "Australia/Perth", name: "Perth (AWST, UTC+8)", group: "Pacific" },
    { id: "Europe/Athens", name: "Athens / Bucharest (EET/EEST, UTC+2/+3)", group: "Europe" },
    { id: "Europe/Dublin", name: "Dublin (GMT/IST, UTC+0/+1)", group: "Europe" },
    { id: "Europe/Helsinki", name: "Helsinki (EET/EEST, UTC+2/+3)", group: "Europe" },
    { id: "Europe/Istanbul", name: "Istanbul (TRT, UTC+3)", group: "Europe" },
    { id: "Europe/Lisbon", name: "Lisbon (WET/WEST, UTC+0/+1)", group: "Europe" },
    { id: "Europe/Madrid", name: "Madrid / Barcelona (CET/CEST, UTC+1/+2)", group: "Europe" },
    { id: "Europe/Stockholm", name: "Stockholm / Oslo (CET/CEST, UTC+1/+2)", group: "Europe" },
    { id: "Europe/Warsaw", name: "Warsaw (CET/CEST, UTC+1/+2)", group: "Europe" },
    { id: "Europe/Zurich", name: "Zurich / Vienna (CET/CEST, UTC+1/+2)", group: "Europe" },
    { id: "Pacific/Fiji", name: "Fiji (FJT, UTC+12)", group: "Pacific" },
    { id: "Pacific/Honolulu", name: "Honolulu / Hawaii (HST, UTC-10)", group: "Pacific" }
  ];

  var ALL_TIMEZONES = POPULAR_TIMEZONES.concat(EXTENDED_TIMEZONES);

  function pad(n) {
    return n < 10 ? "0" + n : String(n);
  }

  function getTimezoneDisplay(timeZoneId, date) {
    date = date || new Date();
    if (!timeZoneId) {
      var localTz = (window.Intl && Intl.DateTimeFormat)
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : "Local";
      var offsetMin = -date.getTimezoneOffset();
      var sign = offsetMin >= 0 ? "+" : "-";
      var absMin = Math.abs(offsetMin);
      var hrs = pad(Math.floor(absMin / 60));
      var mins = pad(absMin % 60);
      return localTz + " (UTC" + sign + hrs + ":" + mins + ")";
    }

    try {
      var formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timeZoneId,
        timeZoneName: "shortOffset"
      });
      var parts = formatter.formatToParts(date);
      var offset = "";
      for (var i = 0; i < parts.length; i++) {
        if (parts[i].type === "timeZoneName") {
          offset = parts[i].value;
          break;
        }
      }
      return timeZoneId + (offset ? " (" + offset + ")" : "");
    } catch (e) {
      return timeZoneId;
    }
  }

  root.VeloX.Timezones = {
    POPULAR_TIMEZONES: POPULAR_TIMEZONES,
    ALL_TIMEZONES: ALL_TIMEZONES,
    getTimezoneDisplay: getTimezoneDisplay
  };
})(typeof window !== "undefined" ? window : this);
