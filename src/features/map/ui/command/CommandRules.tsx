import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/shared/providers";
import { COMMAND_LANES, type CommandLane } from "../../model/commandLanes";
import type { CommandRule, RuleOperator } from "../../model/commandRules";

interface CommandRulesProps {
  onAdd: (rule: Omit<CommandRule, "id">) => void;
  onRemove: (id: string) => void;
  onToggle: (id: string) => void;
  /** Where the rules are evaluated: the point the series is sampled at. */
  place: string;
  rules: readonly CommandRule[];
}

const laneOf = (laneId: string): CommandLane | undefined =>
  COMMAND_LANES.find((lane) => lane.id === laneId);

/**
 * Rules are predicates over the forecast series, written so they read as a
 * sentence: WHEN <variable> <operator> <value> FOR ≥ <hours> AT <place>.
 *
 * There are no operational zones in this console yet, so a rule is evaluated
 * where the series is sampled — the map centre — and says so, rather than
 * borrowing the canon's `IN Z-03` and implying zones that do not exist.
 */
export function CommandRules({ onAdd, onRemove, onToggle, place, rules }: CommandRulesProps) {
  const { t } = useLanguage();
  const [laneId, setLaneId] = useState(COMMAND_LANES[0].id);
  const [operator, setOperator] = useState<RuleOperator>("above");
  const [value, setValue] = useState("15");
  const [minHours, setMinHours] = useState("2");
  const [action, setAction] = useState("");

  const lane = laneOf(laneId);
  const numericValue = Number(value);
  const numericHours = Number(minHours);
  const canAdd =
    Number.isFinite(numericValue) && Number.isFinite(numericHours) && numericHours >= 1 && action.trim().length > 0;

  const submit = () => {
    if (!canAdd) return;
    onAdd({
      action: action.trim(),
      armed: true,
      laneId,
      minHours: numericHours,
      operator,
      value: numericValue,
    });
    setAction("");
  };

  return (
    <>
      <div className="cmd-sec">
        <div className="cmd-sec__h">
          <span className="cmd-sec__t">{t("command.rulesArmed")}</span>
          <span className="cmd-panel__n">{rules.filter((rule) => rule.armed).length}</span>
        </div>

        {rules.length === 0 ? <p className="cmd-empty">{t("command.noRules")}</p> : null}

        {rules.map((rule) => {
          const ruleLane = laneOf(rule.laneId);
          return (
            <div className="cmd-sec" key={rule.id}>
              <div className="cmd-row">
                <span
                  aria-checked={rule.armed}
                  aria-label={t(rule.armed ? "command.disarm" : "command.arm")}
                  className={rule.armed ? "cmd-tg is-on" : "cmd-tg"}
                  onClick={() => onToggle(rule.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") onToggle(rule.id);
                  }}
                  role="switch"
                  tabIndex={0}
                />
                <span className="cmd-row__m">
                  <span className="cmd-row__t">{ruleLane ? t(ruleLane.labelKey) : rule.laneId}</span>
                  <span className="cmd-row__s">{rule.action}</span>
                </span>
                <button
                  aria-label={t("command.removeRule")}
                  className="cmd-ib cmd-ib--sm"
                  onClick={() => onRemove(rule.id)}
                  type="button"
                >
                  <Trash2 aria-hidden="true" strokeWidth={1.5} />
                </button>
              </div>
              <p className="cmd-expr">
                {t("command.exprWhen")} <b>{ruleLane ? t(ruleLane.labelKey) : rule.laneId}</b>{" "}
                <i>{rule.operator === "above" ? ">" : "<"}</i>{" "}
                <u>
                  {rule.value} {ruleLane?.unit}
                </u>{" "}
                {t("command.exprFor")} <i>≥ {rule.minHours} h</i> {t("command.exprAt")} <i>{place}</i>
              </p>
            </div>
          );
        })}
      </div>

      <div aria-hidden="true" className="cmd-rule-line" />

      <div className="cmd-sec">
        <div className="cmd-sec__h">
          <span className="cmd-sec__t">{t("command.newRule")}</span>
        </div>

        <label className="cmd-expr">
          {t("command.exprWhen")}{" "}
          <select aria-label={t("command.ruleVariable")} onChange={(event) => setLaneId(event.target.value)} value={laneId}>
            {COMMAND_LANES.map((candidate) => (
              <option key={candidate.id} value={candidate.id}>
                {t(candidate.labelKey)}
              </option>
            ))}
          </select>{" "}
          <select
            aria-label={t("command.ruleOperator")}
            onChange={(event) => setOperator(event.target.value as RuleOperator)}
            value={operator}
          >
            <option value="above">{">"}</option>
            <option value="below">{"<"}</option>
          </select>{" "}
          <input
            aria-label={t("command.ruleValue")}
            onChange={(event) => setValue(event.target.value)}
            size={5}
            type="number"
            value={value}
          />{" "}
          {lane?.unit} {t("command.exprFor")} ≥{" "}
          <input
            aria-label={t("command.ruleDuration")}
            min="1"
            onChange={(event) => setMinHours(event.target.value)}
            size={3}
            type="number"
            value={minHours}
          />{" "}
          h
        </label>

        {/* The canon requires every alert to carry what to do about it, and
            that is not something the console can invent. */}
        <label className="cmd-expr">
          {t("command.ruleAction")}
          <input
            aria-label={t("command.ruleAction")}
            onChange={(event) => setAction(event.target.value)}
            placeholder={t("command.ruleActionHint")}
            type="text"
            value={action}
          />
        </label>

        <div className="cmd-btnrow">
          <button className="cmd-btn" disabled={!canAdd} onClick={submit} type="button">
            <Plus aria-hidden="true" strokeWidth={1.5} />
            {t("command.armRule")}
          </button>
        </div>
      </div>
    </>
  );
}
