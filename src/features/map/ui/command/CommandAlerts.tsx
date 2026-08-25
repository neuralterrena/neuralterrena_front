import { TriangleAlert, X } from "lucide-react";
import { useLanguage } from "@/shared/providers";
import { excursionPercent, type CommandAlert } from "../../model/commandRules";

const leadLabel = (leadHours: number) =>
  leadHours <= 0 ? "NOW" : `T+${String(leadHours).padStart(2, "0")}`;

interface CommandAlertsProps {
  alerts: readonly CommandAlert[];
  onSelect: (hour: number) => void;
  place: string;
}

/**
 * The alert feed. Every entry answers the four questions the canon requires:
 * when it opens and with how much lead, how sure — which variable and how far
 * past its limit — where it is evaluated, and what to do about it.
 */
export function CommandAlerts({ alerts, onSelect, place }: CommandAlertsProps) {
  const { t } = useLanguage();

  if (alerts.length === 0) {
    return <p className="cmd-empty">{t("command.noAlerts")}</p>;
  }

  return (
    <>
      {alerts.map((alert) => {
        const excursion = excursionPercent(alert.rule, alert.trigger.peak);
        return (
          <button
            className={`cmd-alert cmd-sev--${alert.trigger.severity}${alert.trigger.severity === "critical" ? " cmd-alert--critical" : ""}`}
            key={alert.rule.id}
            onClick={() => onSelect(alert.trigger.startHour)}
            type="button"
          >
            <span className="cmd-dot" />
            <span className="cmd-alert__m">
              <span className="cmd-alert__t">
                {t(alert.lane.labelKey)} {alert.rule.operator === "above" ? ">" : "<"} {alert.rule.value}{" "}
                {alert.lane.unit}
              </span>
              <span className="cmd-alert__x">
                {/* how sure */}
                {t("command.alertPeak")} {alert.trigger.peak.toFixed(1)} {alert.lane.unit}
                {excursion === null ? "" : ` · ${excursion > 0 ? "+" : ""}${String(excursion)}%`}
                <br />
                {/* when */}
                {t("command.alertWindow")} +{alert.trigger.startHour} h → +{alert.trigger.endHour} h
                <br />
                {/* where */}
                {t("command.alertAt")} {place}
                <br />
                {/* what to do */}
                {alert.rule.action}
              </span>
            </span>
            <span className="cmd-alert__lead">
              <b>{leadLabel(alert.trigger.leadHours)}</b>
              <s>{t("command.alertLead")}</s>
            </span>
          </button>
        );
      })}
    </>
  );
}

interface CommandBannerProps {
  alert: CommandAlert;
  onDismiss: () => void;
  onSelect: (hour: number) => void;
}

/**
 * The critical banner — the only red-filled surface in the system, and only
 * for a window that is already running.
 */
export function CommandBanner({ alert, onDismiss, onSelect }: CommandBannerProps) {
  const { t } = useLanguage();

  return (
    <div className="cmd-banner" role="alert">
      <TriangleAlert aria-hidden="true" strokeWidth={1.75} />
      <div className="cmd-banner__m">
        <span className="cmd-banner__t">
          {t(alert.lane.labelKey)} {alert.rule.operator === "above" ? ">" : "<"} {alert.rule.value}{" "}
          {alert.lane.unit}
        </span>
        <span className="cmd-banner__s">{alert.rule.action}</span>
      </div>
      <b>{alert.trigger.peak.toFixed(1)}</b>
      <button onClick={() => onSelect(alert.trigger.startHour)} type="button">
        {t("command.alertGoTo")}
      </button>
      <button aria-label={t("command.alertDismiss")} className="cmd-banner__x" onClick={onDismiss} type="button">
        <X aria-hidden="true" strokeWidth={1.75} />
      </button>
    </div>
  );
}
