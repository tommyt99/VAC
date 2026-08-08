"""Local Streamlit experience for the trained concrete-strength model."""

from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
import plotly.graph_objects as go
import streamlit as st

from concrete_strength.predictor import ConcreteStrengthPredictor

PROJECT_ROOT = Path(__file__).resolve().parent
DEFAULT_MODEL = PROJECT_ROOT / "artifacts" / "model.joblib"
THEME_PATH = PROJECT_ROOT / "assets" / "theme.css"
DARK_THEME_PATH = PROJECT_ROOT / "assets" / "theme_dark.css"

st.set_page_config(
    page_title="Concrete Strength — Mix Record",
    page_icon="▦",
    layout="wide",
    initial_sidebar_state="collapsed",
)


@st.cache_resource
def load_model(
    path: str, artifact_mtime_ns: int, completion_mtime_ns: int
) -> ConcreteStrengthPredictor:
    del artifact_mtime_ns, completion_mtime_ns
    return ConcreteStrengthPredictor.load(path)


def render_html(markup: str) -> None:
    st.markdown(markup, unsafe_allow_html=True)


def render_section(code: str, title: str, description: str) -> None:
    render_html(
        f"""
        <div class="cs-section-heading">
          <div class="cs-section-code">{code}</div>
          <div class="cs-section-title"><h2>{title}</h2><p>{description}</p></div>
        </div>
        """
    )


render_html(f"<style>{THEME_PATH.read_text(encoding='utf-8')}</style>")
dark_mode = st.toggle(
    "Dark mode",
    value=True,
    key="dark_mode",
    help="Switch between charcoal-stock and warm-paper versions of the worksheet.",
)
if dark_mode:
    render_html(f"<style>{DARK_THEME_PATH.read_text(encoding='utf-8')}</style>")

chart_palette = (
    {
        "background": "#282B27",
        "line": "#94B8BC",
        "interval": "rgba(148, 184, 188, 0.16)",
        "marker": "#E39577",
        "marker_outline": "#242724",
        "guide": "rgba(227, 149, 119, 0.58)",
        "annotation_text": "#F0EDE4",
        "annotation_background": "rgba(28, 31, 29, 0.97)",
        "annotation_border": "rgba(227, 149, 119, 0.62)",
        "text": "#C7C5BB",
        "hover_background": "#1C1F1D",
        "hover_border": "#8B8D83",
        "hover_text": "#F0EDE4",
        "control_background": "#30332E",
        "control_border": "#8B8D83",
        "control_text": "#F0EDE4",
        "grid": "rgba(240, 237, 228, 0.12)",
        "minor_grid": "rgba(240, 237, 228, 0.055)",
        "axis": "rgba(240, 237, 228, 0.30)",
    }
    if dark_mode
    else {
        "background": "#FBF7EC",
        "line": "#315F68",
        "interval": "rgba(49, 95, 104, 0.12)",
        "marker": "#B45D36",
        "marker_outline": "#FFFFFF",
        "guide": "rgba(180, 93, 54, 0.48)",
        "annotation_text": "#4A2B1F",
        "annotation_background": "rgba(251, 247, 236, 0.96)",
        "annotation_border": "rgba(180, 93, 54, 0.35)",
        "text": "#4F5556",
        "hover_background": "#FBF7EC",
        "hover_border": "#D5D2CA",
        "hover_text": "#20252B",
        "control_background": "#FBF7EC",
        "control_border": "#D5D2CA",
        "control_text": "#3E4548",
        "grid": "rgba(32, 37, 43, 0.08)",
        "minor_grid": "rgba(32, 37, 43, 0.04)",
        "axis": "rgba(32, 37, 43, 0.16)",
    }
)

model_path = Path(os.environ.get("CONCRETE_MODEL_PATH", DEFAULT_MODEL))
if not model_path.exists():
    st.error(
        "No trained model was found. Run `concrete-strength train ...` first, or set "
        "`CONCRETE_MODEL_PATH`."
    )
    st.stop()

completion_path = model_path.parent / "RUN_COMPLETE.json"
completion_mtime = completion_path.stat().st_mtime_ns if completion_path.exists() else 0
try:
    predictor = load_model(str(model_path), model_path.stat().st_mtime_ns, completion_mtime)
except (OSError, TypeError, ValueError) as error:
    st.error(f"The model artifact could not be verified or loaded: {error}")
    st.stop()

completion = {}
if completion_path.exists():
    completion = json.loads(completion_path.read_text(encoding="utf-8"))
run_id = str(completion.get("run_id", "local"))[:8].upper()
training_report = predictor.metadata.get("training_report", {})
holdout_mae = training_report.get("development_holdout", {}).get("mae_mpa")
validation_summary = (
    f"Development holdout MAE {holdout_mae:.2f} MPa"
    if holdout_mae is not None
    else "Validation result unavailable"
)

render_html(
    f"""
    <header class="cs-sheet-header">
      <div class="cs-sheet-code">CS–01</div>
      <div class="cs-sheet-name">Concrete strength / model worksheet</div>
      <div class="cs-sheet-meta"><span>SI units</span><span>Run {run_id}</span></div>
    </header>
    <section class="cs-cover">
      <div class="cs-cover-number" aria-hidden="true">01</div>
      <div class="cs-cover-copy">
        <div class="cs-overline">Compressive strength screening estimate</div>
        <h1>Concrete<br><em>mix record</em></h1>
        <p>
          Record a trial mixture and curing age. The worksheet returns a modelled strength,
          a recipe-level interval, and a check against the training ranges.
        </p>
        <dl class="cs-cover-facts">
          <div><dt>Mix</dt><dd>kg/m³</dd></div>
          <div><dt>Result</dt><dd>MPa</dd></div>
          <div><dt>Interval</dt><dd>{predictor.interval_coverage:.0%} nominal</dd></div>
        </dl>
      </div>
      <div class="cs-specimen" aria-hidden="true">
        <div class="cs-cylinder">
          <div class="cs-cylinder-top"></div>
          <div class="cs-cylinder-body"></div>
          <div class="cs-cylinder-label">Model<br>estimate</div>
        </div>
        <div class="cs-specimen-caption">Recipe / age / estimate</div>
      </div>
    </section>
    """
)

if predictor.metadata.get("training_mode") == "smoke":
    st.warning(
        "Development model — this artifact was produced in quick-run mode for software checks. "
        "Do not use its estimates for engineering decisions."
    )

render_section(
    "A",
    "Mix proportions",
    "Record each constituent as mass per cubic metre, then set the curing age.",
)

with st.form("mixture"):
    binder_column, liquid_column, aggregate_column = st.columns(3, gap="large")
    with binder_column:
        render_html('<div class="cs-input-group">Binder materials</div>')
        cement = st.number_input(
            "Cement (kg/m³)", min_value=0.0, value=280.0, step=5.0, help="Portland cement content"
        )
        slag = st.number_input(
            "Blast-furnace slag (kg/m³)", min_value=0.0, value=70.0, step=5.0
        )
        fly_ash = st.number_input("Fly ash (kg/m³)", min_value=0.0, value=55.0, step=5.0)
    with liquid_column:
        render_html('<div class="cs-input-group">Water and curing</div>')
        water = st.number_input("Water (kg/m³)", min_value=0.0, value=180.0, step=5.0)
        superplasticizer = st.number_input(
            "Superplasticizer (kg/m³)", min_value=0.0, value=6.0, step=0.5
        )
        age = st.number_input("Curing age (days)", min_value=1.0, value=28.0, step=1.0)
    with aggregate_column:
        render_html('<div class="cs-input-group">Aggregates</div>')
        coarse = st.number_input(
            "Coarse aggregate (kg/m³)", min_value=0.0, value=970.0, step=5.0
        )
        fine = st.number_input(
            "Fine aggregate (kg/m³)", min_value=0.0, value=770.0, step=5.0
        )
    render_html(
        """
        <p class="cs-form-note">
          <strong>Field note.</strong> The range check compares each input with the model's
          training ranges. It is not a specification or mix-acceptance check.
        </p>
        """
    )
    submitted = st.form_submit_button(
        "Calculate model estimate", type="primary", width="stretch"
    )

submitted_inputs = (
    {
        "cement": cement,
        "blast_furnace_slag": slag,
        "fly_ash": fly_ash,
        "water": water,
        "superplasticizer": superplasticizer,
        "coarse_aggregate": coarse,
        "fine_aggregate": fine,
        "age": age,
    }
    if submitted
    else None
)
prediction_inputs = submitted_inputs or st.session_state.get("last_prediction_inputs")

if prediction_inputs is not None:
    inputs = prediction_inputs
    try:
        result = predictor.predict(inputs).iloc[0]
    except ValueError as error:
        st.error(str(error))
        st.stop()
    if submitted_inputs is not None:
        st.session_state["last_prediction_inputs"] = submitted_inputs

    cement = float(inputs["cement"])
    slag = float(inputs["blast_furnace_slag"])
    fly_ash = float(inputs["fly_ash"])
    water = float(inputs["water"])
    superplasticizer = float(inputs["superplasticizer"])
    coarse = float(inputs["coarse_aggregate"])
    fine = float(inputs["fine_aggregate"])
    age = float(inputs["age"])

    render_section(
        "B",
        "Strength estimate",
        "Calculated result for the submitted mix and curing age—not a physical test result.",
    )
    render_html(
        f"""
        <div class="cs-result-classification">
          <strong>Model estimate — not a test result</strong>
          <span>{age:g}-day model readout</span>
        </div>
        """
    )

    metric, interval, status = st.columns([1.45, 1, 1], gap="medium")
    with metric:
        with st.container(key="primary_result"):
            st.metric("Predicted strength", f"{result.predicted_strength_mpa:.1f} MPa")
    with interval:
        with st.container(key="interval_result"):
            st.metric(
                f"{predictor.interval_coverage:.0%} recipe-level interval",
                f"{result.interval_lower_mpa:.1f}–{result.interval_upper_mpa:.1f} MPa",
            )
    with status:
        with st.container(key="range_result"):
            st.metric(
                "Range screen",
                (
                    "Within training ranges"
                    if result.in_training_domain
                    else "Outside training ranges"
                ),
            )
    render_html(
        f'<div class="cs-unit-line">Equivalent point estimate: '
        f'{result.predicted_strength_psi:,.0f} psi</div>'
    )
    if result.warnings:
        st.warning(
            "Outside training range — at least one input falls beyond the values represented "
            "in the training data. Interpret this extrapolated estimate with added caution. "
            f"{result.warnings}"
        )

    binder = cement + slag + fly_ash
    aggregate = coarse + fine
    water_binder = f"{water / binder:.2f}" if binder else "—"
    scm_share = f"{100.0 * (slag + fly_ash) / binder:.0f}%" if binder else "—"
    aggregate_binder = f"{aggregate / binder:.2f}" if binder else "—"
    render_html(
        f"""
        <h3 class="cs-subheading">Mix summary</h3>
        <div class="cs-readouts" aria-label="Mix summary">
          <div class="cs-readout">
            <span>Total binder</span><strong>{binder:,.0f} kg/m³</strong>
          </div>
          <div class="cs-readout">
            <span>Water / binder</span><strong>{water_binder}</strong>
          </div>
          <div class="cs-readout"><span>SCM share</span><strong>{scm_share}</strong></div>
          <div class="cs-readout">
            <span>Aggregate / binder</span><strong>{aggregate_binder}</strong>
          </div>
        </div>
        """
    )

    render_html(
        f"""
        <div class="cs-chart-header">
          <div class="cs-chart-heading">
            <div class="cs-section-code">C</div>
            <div><h3>Strength development</h3><span>Model curve / submitted mixture</span></div>
          </div>
          <p>
            At {age:g} days: {result.predicted_strength_mpa:.1f} MPa, with a nominal
            {predictor.interval_coverage:.0%} interval of
            {result.interval_lower_mpa:.1f}–{result.interval_upper_mpa:.1f} MPa.
            Other mix inputs are held constant; this curve is model output, not test data.
          </p>
        </div>
        """
    )

    training_age_min = max(1.0, predictor.domain_bounds["age"]["min"])
    training_age_max = predictor.domain_bounds["age"]["max"]
    curve_age_min = min(training_age_min, float(age))
    curve_age_max = max(training_age_max, float(age))
    curve_ages = np.unique(
        np.concatenate(
            [
                np.geomspace(curve_age_min, curve_age_max, 96),
                np.asarray([float(age)]),
            ]
        )
    )
    curve = pd.DataFrame([{**inputs, "age": curve_age} for curve_age in curve_ages])
    curve_result = predictor.predict(curve)
    prediction = curve_result["predicted_strength_mpa"].to_numpy()
    lower = curve_result["interval_lower_mpa"].to_numpy()
    upper = curve_result["interval_upper_mpa"].to_numpy()
    hover_data = np.column_stack([lower, upper])

    figure = go.Figure()
    figure.add_trace(
        go.Scatter(
            x=curve_ages,
            y=lower,
            mode="lines",
            line={"width": 0},
            hoverinfo="skip",
            showlegend=False,
        )
    )
    figure.add_trace(
        go.Scatter(
            x=curve_ages,
            y=upper,
            mode="lines",
            line={"width": 0},
            fill="tonexty",
            fillcolor=chart_palette["interval"],
            hoverinfo="skip",
            name=f"Nominal {predictor.interval_coverage:.0%} interval",
        )
    )
    figure.add_trace(
        go.Scatter(
            x=curve_ages,
            y=prediction,
            customdata=hover_data,
            mode="lines",
            name="Model estimate",
            line={"color": chart_palette["line"], "width": 3},
            hovertemplate=(
                "<b>%{x:.0f} days</b><br>"
                "Estimate&nbsp;&nbsp;%{y:.1f} MPa<br>"
                "Interval&nbsp;&nbsp;%{customdata[0]:.1f}–%{customdata[1]:.1f} MPa"
                "<extra></extra>"
            ),
        )
    )
    figure.add_trace(
        go.Scatter(
            x=[float(age)],
            y=[float(result.predicted_strength_mpa)],
            mode="markers",
            marker={
                "size": 11,
                "color": chart_palette["marker"],
                "line": {"color": chart_palette["marker_outline"], "width": 2},
            },
            hoverinfo="skip",
            showlegend=False,
        )
    )
    figure.add_vline(
        x=float(age),
        line_width=1,
        line_dash="dot",
        line_color=chart_palette["guide"],
    )
    figure.add_annotation(
        x=float(age),
        y=float(result.predicted_strength_mpa),
        text=f"<b>{age:g} days</b> · {result.predicted_strength_mpa:.1f} MPa",
        showarrow=False,
        yshift=26,
        font={"color": chart_palette["annotation_text"], "size": 13},
        bgcolor=chart_palette["annotation_background"],
        bordercolor=chart_palette["annotation_border"],
        borderpad=7,
    )

    standard_ticks = [1, 3, 7, 14, 28, 56, 90, 180, 365]
    figure.update_layout(
        height=470,
        autosize=True,
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor=chart_palette["background"],
        font={
            "family": "ui-sans-serif, system-ui, sans-serif",
            "color": chart_palette["text"],
        },
        hovermode="x unified",
        hoverlabel={
            "bgcolor": chart_palette["hover_background"],
            "bordercolor": chart_palette["hover_border"],
            "font": {"color": chart_palette["hover_text"]},
        },
        margin={"l": 12, "r": 12, "t": 64, "b": 72},
        legend={
            "orientation": "h",
            "x": 0,
            "y": -0.22,
            "font": {"size": 12, "color": chart_palette["text"]},
        },
        updatemenus=[
            {
                "type": "buttons",
                "direction": "right",
                "active": 0,
                "x": 1,
                "xanchor": "right",
                "y": 1.14,
                "yanchor": "top",
                "bgcolor": chart_palette["control_background"],
                "bordercolor": chart_palette["control_border"],
                "font": {"color": chart_palette["control_text"], "size": 11},
                "buttons": [
                    {
                        "label": "Log scale",
                        "method": "relayout",
                        "args": [
                            {
                                "xaxis.type": "log",
                                "xaxis.tickmode": "array",
                                "xaxis.tickvals": standard_ticks,
                            }
                        ],
                    },
                    {
                        "label": "Linear scale",
                        "method": "relayout",
                        "args": [
                            {
                                "xaxis.type": "linear",
                                "xaxis.tickmode": "auto",
                                "xaxis.nticks": 9,
                            }
                        ],
                    },
                ],
            }
        ],
    )
    figure.update_xaxes(
        title="Curing age (days)",
        type="log",
        tickmode="array",
        tickvals=standard_ticks,
        ticktext=[str(value) for value in standard_ticks],
        gridcolor=chart_palette["grid"],
        linecolor=chart_palette["axis"],
        minor={
            "showgrid": True,
            "gridcolor": chart_palette["minor_grid"],
            "gridwidth": 0.5,
        },
        mirror=True,
        ticks="outside",
        zeroline=False,
    )
    figure.update_yaxes(
        title="Compressive strength (MPa)",
        rangemode="tozero",
        gridcolor=chart_palette["grid"],
        linecolor=chart_palette["axis"],
        minor={
            "showgrid": True,
            "gridcolor": chart_palette["minor_grid"],
            "gridwidth": 0.5,
        },
        mirror=True,
        ticks="outside",
        zeroline=False,
    )
    st.plotly_chart(
        figure,
        width="stretch",
        config={"displayModeBar": False, "responsive": True, "scrollZoom": False},
    )
else:
    render_html(
        """
        <div class="cs-pending-ticket">
          <span>Next</span>
          <p>Complete Section A to issue a model estimate and strength-development sheet.</p>
        </div>
        """
    )

render_html(
    f"""
    <footer class="cs-footer">
      <div class="cs-footer-label">Screening estimate</div>
      <div class="cs-footer-copy">
        <strong>Engineering use.</strong> This model worksheet uses a small historical benchmark.
        It is not a laboratory report and does not document a batch, specimen, or physical test.
        It does not replace trial batching, acceptance testing, specifications, structural design,
        or professional engineering judgment.
      </div>
      <div class="cs-footer-meta">
        {predictor.model_name.replace('_', ' ')} · {validation_summary}<br>
        Run {run_id} · MPa primary · psi secondary
      </div>
    </footer>
    """
)
