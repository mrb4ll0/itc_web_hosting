import {
  removeNotification,
  showNotification,
  updateNotification,
} from "../../../js/general/generalmethods.js";

export default class Analytics {
  constructor(tabManager) {
    this.tabManager = tabManager;
    this.name = "Analytics";
    this.analyticsData = {};
    this.currentPeriod = "30d";
  }

  async init() {
    //console.log("Initializing Analytics Tab");
    this.initializeElements();
    this.initializeEventListeners();
    await this.buildAnalyticsContent();
  }

  refresh(tabManager) {
    this.tabManager = tabManager;
    this.buildAnalyticsContent();
  }

  initializeElements() {
    // Control elements
    this.analyticsPeriod = document.getElementById("analytics-period");
    this.exportBtn = document.getElementById("export-analytics-btn");

    // Metric elements
    this.totalApplications = document.getElementById("total-applications");
    this.applicationsTrend = document.getElementById("applications-trend");
    this.acceptanceRate = document.getElementById("acceptance-rate");
    this.acceptanceTrend = document.getElementById("acceptance-trend");
    this.completionRate = document.getElementById("completion-rate");
    this.completionTrend = document.getElementById("completion-trend");
    this.avgDuration = document.getElementById("avg-duration");
    this.durationTrend = document.getElementById("duration-trend");

    // Chart containers
    this.applicationsChart = document.getElementById("applications-chart");
    this.statusChart = document.getElementById("status-chart");
    this.courseChart = document.getElementById("course-chart");
    this.institutionChart = document.getElementById("institution-chart");

    // Table and insights
    this.coursePerformanceBody = document.getElementById(
      "course-performance-body"
    );
    this.insightsList = document.getElementById("insights-list");

    //console.log("Analytics elements initialized");
  }

  initializeEventListeners() {
    // Period selector
    if (this.analyticsPeriod) {
      this.analyticsPeriod.addEventListener("change", (e) => {
        this.currentPeriod = e.target.value;
        this.buildAnalyticsContent();
      });
    }

    // Export button
    if (this.exportBtn) {
      this.exportBtn.addEventListener("click", () => {
        this.exportAnalytics();
      });
    }
  }

  async buildAnalyticsContent() {
    //console.log("Building analytics content...");

    // Process analytics data
    this.processAnalyticsData();

    // Update metrics
    this.updateKeyMetrics();

    // Render charts
    this.renderApplicationsChart();
    this.renderStatusChart();
    this.renderCourseChart();
    this.renderInstitutionChart();

    // Update tables and insights
    this.renderCoursePerformance();
    this.renderPerformanceInsights();
  }

  processAnalyticsData() {
    const allApplications = this.tabManager.getAllCompanyApplications();
    const now = new Date();

    // Filter data based on selected period
    const filteredData = this.filterDataByPeriod(
      allApplications,
      this.currentPeriod
    );

    // Calculate metrics
    this.analyticsData = {
      period: this.currentPeriod,
      totalApplications: filteredData.length,
      applicationsByStatus: this.groupByStatus(filteredData),
      applicationsByCourse: this.groupByCourse(filteredData),
      applicationsByInstitution: this.groupByInstitution(filteredData),
      applicationsOverTime: this.groupByTime(filteredData),
      trainingMetrics: this.calculateTrainingMetrics(filteredData),
      comparisonData: this.calculateComparisonData(
        allApplications,
        this.currentPeriod
      ),
    };

    console.log("Processed analytics data:", this.analyticsData);
  }

  filterDataByPeriod(data, period) {
    const now = new Date();
    let startDate;

    switch (period) {
      case "7d":
        startDate = new Date(now.setDate(now.getDate() - 7));
        break;
      case "30d":
        startDate = new Date(now.setDate(now.getDate() - 30));
        break;
      case "90d":
        startDate = new Date(now.setDate(now.getDate() - 90));
        break;
      case "1y":
        startDate = new Date(now.setFullYear(now.getFullYear() - 1));
        break;
      case "all":
      default:
        return data; // Return all data
    }

    return data.filter((item) => {
      const applicationDate =
        item.application?.applicationDate ||
        item.application?.submittedAt ||
        item.application?.createdAt;
      if (!applicationDate) return false;

      const itemDate = new Date(applicationDate);
      return itemDate >= startDate;
    });
  }

  groupByStatus(data) {
    const statusCounts = {
      pending: 0,
      shortlisted: 0,
      accepted: 0,
      rejected: 0,
    };

    data.forEach((item) => {
      const status = item.application?.status || "pending";
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      }
    });

    return statusCounts;
  }

  groupByCourse(data) {
    const courseData = {};

    data.forEach((item) => {
      // FIXED: Access opportunity directly, not opportunity.title
      const course = item.opportunity || "Unknown Course";
      if (!courseData[course]) {
        courseData[course] = {
          count: 0,
          accepted: 0,
          completed: 0,
          totalDuration: 0,
          durationCount: 0,
        };
      }

      courseData[course].count++;

      if (item.application?.status === "accepted") {
        courseData[course].accepted++;
      }

      // Calculate completion and duration for training metrics
      if (item.application?.progress === 100) {
        courseData[course].completed++;
      }

      const duration = item.application?.duration;
      if (duration?.startDate && duration?.endDate) {
        const start = new Date(duration.startDate);
        const end = new Date(duration.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        courseData[course].totalDuration += days;
        courseData[course].durationCount++;
      }
    });

    return courseData;
  }

  groupByInstitution(data) {
    const institutionData = {};

    data.forEach((item) => {
      // FIXED: Access student.institution directly
      const institution =
        item.application?.student?.institution || "Unknown Institution";
      if (!institutionData[institution]) {
        institutionData[institution] = {
          count: 0,
          accepted: 0,
          completed: 0,
        };
      }

      institutionData[institution].count++;

      if (item.application?.status === "accepted") {
        institutionData[institution].accepted++;
      }

      if (item.application?.progress === 100) {
        institutionData[institution].completed++;
      }
    });

    return institutionData;
  }

  groupByTime(data) {
    const timeData = {};
    const now = new Date();
    const days =
      this.currentPeriod === "7d" ? 7 : this.currentPeriod === "30d" ? 30 : 90;

    // Initialize time slots with zeros
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(now.getDate() - i);
      const dateKey = date.toISOString().split("T")[0];
      timeData[dateKey] = 0;
    }

    // Count applications per day
    data.forEach((item) => {
      const applicationDate =
        item.application?.applicationDate ||
        item.application?.submittedAt ||
        item.application?.createdAt;
      if (!applicationDate) return;

      const itemDate = new Date(applicationDate);
      const dateKey = itemDate.toISOString().split("T")[0];
      if (timeData[dateKey] !== undefined) {
        timeData[dateKey]++;
      }
    });

    return timeData;
  }

  calculateTrainingMetrics(data) {
    const metrics = {
      totalTrainees: 0,
      completedTrainees: 0,
      totalDuration: 0,
      durationCount: 0,
      acceptanceRate: 0,
      completionRate: 0,
      avgDuration: 0,
    };

    const acceptedApplications = data.filter(
      (item) => item.application?.status === "accepted"
    );
    metrics.totalTrainees = acceptedApplications.length;

    metrics.completedTrainees = acceptedApplications.filter(
      (item) => item.application?.progress === 100
    ).length;

    // Calculate durations
    acceptedApplications.forEach((item) => {
      const duration = item.application?.duration;
      if (duration?.startDate && duration?.endDate) {
        const start = new Date(duration.startDate);
        const end = new Date(duration.endDate);
        const days = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
        metrics.totalDuration += days;
        metrics.durationCount++;
      }
    });

    // Calculate rates
    metrics.acceptanceRate =
      data.length > 0 ? (acceptedApplications.length / data.length) * 100 : 0;

    metrics.completionRate =
      metrics.totalTrainees > 0
        ? (metrics.completedTrainees / metrics.totalTrainees) * 100
        : 0;

    metrics.avgDuration =
      metrics.durationCount > 0
        ? metrics.totalDuration / metrics.durationCount
        : 0;

    return metrics;
  }

  calculateComparisonData(allData, currentPeriod) {
    // Calculate actual comparison with previous period
    const currentData = this.filterDataByPeriod(allData, currentPeriod);
    const previousData = this.filterDataByPeriod(
      allData,
      this.getPreviousPeriod(currentPeriod)
    );

    const currentMetrics = this.calculateTrainingMetrics(currentData);
    const previousMetrics = this.calculateTrainingMetrics(previousData);

    return {
      applicationsChange: this.calculatePercentageChange(
        previousData.length,
        currentData.length
      ),
      acceptanceChange: this.calculatePercentageChange(
        previousMetrics.acceptanceRate,
        currentMetrics.acceptanceRate
      ),
      completionChange: this.calculatePercentageChange(
        previousMetrics.completionRate,
        currentMetrics.completionRate
      ),
      durationChange: this.calculatePercentageChange(
        previousMetrics.avgDuration,
        currentMetrics.avgDuration
      ),
    };
  }

  getPreviousPeriod(currentPeriod) {
    const periodMap = {
      "7d": "7d",
      "30d": "30d",
      "90d": "90d",
      "1y": "1y",
      all: "all",
    };
    return periodMap[currentPeriod];
  }

  calculatePercentageChange(previous, current) {
    if (!previous || previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  }

  updateKeyMetrics() {
    const metrics = this.analyticsData.trainingMetrics;
    const comparison = this.analyticsData.comparisonData;

    // Total Applications
    if (this.totalApplications) {
      this.totalApplications.textContent =
        this.analyticsData.totalApplications.toLocaleString();
    }
    if (this.applicationsTrend) {
      this.updateTrendElement(
        this.applicationsTrend,
        comparison.applicationsChange
      );
    }

    // Acceptance Rate
    if (this.acceptanceRate) {
      this.acceptanceRate.textContent = `${metrics.acceptanceRate.toFixed(1)}%`;
    }
    if (this.acceptanceTrend) {
      this.updateTrendElement(
        this.acceptanceTrend,
        comparison.acceptanceChange
      );
    }

    // Completion Rate
    if (this.completionRate) {
      this.completionRate.textContent = `${metrics.completionRate.toFixed(1)}%`;
    }
    if (this.completionTrend) {
      this.updateTrendElement(
        this.completionTrend,
        comparison.completionChange
      );
    }

    // Average Duration
    if (this.avgDuration) {
      this.avgDuration.textContent = `${metrics.avgDuration.toFixed(0)} days`;
    }
    if (this.durationTrend) {
      this.updateTrendElement(this.durationTrend, comparison.durationChange);
    }
  }

  updateTrendElement(element, change) {
    if (change > 0) {
      element.innerHTML = `<span class="material-symbols-outlined text-xs align-middle">trending_up</span> +${change.toFixed(
        1
      )}%`;
      element.className = "text-xs text-green-600 dark:text-green-400 mt-1";
    } else if (change < 0) {
      element.innerHTML = `<span class="material-symbols-outlined text-xs align-middle">trending_down</span> ${change.toFixed(
        1
      )}%`;
      element.className = "text-xs text-red-600 dark:text-red-400 mt-1";
    } else {
      element.innerHTML = `<span class="material-symbols-outlined text-xs align-middle">trending_flat</span> 0%`;
      element.className = "text-xs text-gray-600 dark:text-gray-400 mt-1";
    }
  }

  renderApplicationsChart() {
    const chart = this.applicationsChart;
    if (!chart) return;

    const timeData = this.analyticsData.applicationsOverTime;

    // Convert to arrays and sort by date
    const labels = Object.keys(timeData).sort(
      (a, b) => new Date(a) - new Date(b)
    );
    const values = labels.map((label) => timeData[label]);

    // --- No Data Case ---
    const noData = labels.length === 0 || values.every((v) => v === 0);
    if (noData) {
      chart.innerHTML = `
      <div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div class="text-center">
          <span class="material-symbols-outlined text-4xl mb-2 opacity-50">bar_chart</span>
          <p>No data available for selected period</p>
        </div>
      </div>`;
      return;
    }

    // --- Chart Dimensions ---
    const maxValue = Math.max(...values, 1);
    const width = 400;
    const height = 200;
    const chartHeight = 160;
    const chartWidth = 380;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };

    // --- Bar Width ---
    const innerWidth = chartWidth - margin.left - margin.right;
    const barWidth = Math.max(6, Math.min(20, innerWidth / labels.length - 1)); // Smaller bars for more data points

    // --- Label Interval (show fewer labels to avoid crowding) ---
    const labelInterval = Math.max(1, Math.ceil(labels.length / 8)); // Reduced from 10 to 8

    // --- Helpers ---
    const formatLabel = (label, index) => {
      const d = new Date(label);

      // For many data points, show only some labels to avoid crowding
      if (index % labelInterval !== 0 && index !== labels.length - 1) {
        return ""; // Return empty string for labels we want to skip
      }

      // Show month and day for better context with future dates
      return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    };

    const barItems = values
      .map((value, i) => {
        const barHeight =
          value > 0
            ? (value / maxValue) * (chartHeight - margin.top - margin.bottom)
            : 0;
        const x = margin.left + i * (barWidth + 1); // Reduced spacing
        const y = chartHeight - barHeight - margin.bottom;

        return `
        <g>
          <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}"
                fill="#3b82f6"
                class="opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                data-value="${value}"
                data-date="${labels[i]}">
          </rect>

          ${
            value > 0
              ? `
          <text x="${x + barWidth / 2}" y="${y - 5}"
                text-anchor="middle"
                class="text-[10px] fill-gray-700 dark:fill-gray-300 font-medium">
            ${value}
          </text>
          `
              : ""
          }
        </g>`;
      })
      .join("");

    const xLabels = labels
      .map((label, i) => {
        const formattedLabel = formatLabel(label, i);
        if (!formattedLabel) return ""; // Skip empty labels

        const x = margin.left + i * (barWidth + 1) + barWidth / 2;
        const y = chartHeight + 15;

        return `
        <text x="${x}" y="${y}"
              text-anchor="middle"
              class="text-[10px] fill-gray-500 dark:fill-gray-400">
          ${formattedLabel}
        </text>`;
      })
      .join("");

    const yLabels = [];
    // Create Y-axis labels based on actual data range
    const ySteps = maxValue <= 5 ? maxValue : 5;
    for (let i = 0; i <= ySteps; i++) {
      const value = Math.round((i / ySteps) * maxValue);
      const y =
        chartHeight -
        (i / ySteps) * (chartHeight - margin.top - margin.bottom) -
        margin.bottom;

      yLabels.push(`
      <g>
        <line x1="${margin.left - 5}" y1="${y}" 
              x2="${margin.left}" y2="${y}"
              stroke="#e5e7eb" class="dark:stroke-gray-600"></line>
        <text x="${margin.left - 8}" y="${y + 3}"
              text-anchor="end"
              class="text-[10px] fill-gray-500 dark:fill-gray-400">
          ${value}
        </text>
      </g>
    `);
    }

    // --- Final SVG Output ---
    chart.innerHTML = `
    <svg viewBox="0 0 ${width} ${height}" class="w-full h-full" preserveAspectRatio="xMidYMid meet">

      <!-- Y-axis -->
      <line x1="${margin.left}" y1="${margin.top}"
            x2="${margin.left}" y2="${chartHeight}"
            stroke="#e5e7eb" class="dark:stroke-gray-600"></line>

      <!-- X-axis -->
      <line x1="${margin.left}" y1="${chartHeight}"
            x2="${chartWidth - margin.right}" y2="${chartHeight}"
            stroke="#e5e7eb" class="dark:stroke-gray-600"></line>

      <!-- Grid lines -->
      ${yLabels
        .map((_, i) => {
          const y =
            chartHeight -
            (i / ySteps) * (chartHeight - margin.top - margin.bottom) -
            margin.bottom;
          return `<line x1="${margin.left}" y1="${y}" x2="${
            chartWidth - margin.right
          }" y2="${y}" stroke="#f3f4f6" class="dark:stroke-gray-700" />`;
        })
        .join("")}

      ${barItems}
      ${xLabels}
      ${yLabels.join("")}
    </svg>`;

    this.addChartInteractivity();
  }

  addChartInteractivity() {
    const bars = this.applicationsChart.querySelectorAll("rect");
    bars.forEach((bar) => {
      bar.addEventListener("mouseenter", (e) => {
        const value = e.target.getAttribute("data-value");
        const date = e.target.getAttribute("data-date");
        const formattedDate = new Date(date).toLocaleDateString("en-US", {
          weekday: "short",
          year: "numeric",
          month: "short",
          day: "numeric",
        });

        // Simple tooltip
        e.target.setAttribute("fill", "#1d4ed8"); // Darker blue on hover
        console.log(`Applications: ${value} on ${formattedDate}`); // For debugging
      });

      bar.addEventListener("mouseleave", (e) => {
        e.target.setAttribute("fill", "#3b82f6"); // Restore original color
      });
    });
  }
  addChartInteractivity() {
    // Add hover tooltips to bars
    const bars = this.applicationsChart.querySelectorAll("rect");
    bars.forEach((bar) => {
      bar.addEventListener("mouseenter", (e) => {
        const value = e.target.getAttribute("data-value");
        // You could add a tooltip here if needed
      });

      bar.addEventListener("mouseleave", () => {
        // Remove tooltip if added
      });
    });
  }
  renderStatusChart() {
    if (!this.statusChart) return;

    const statusData = this.analyticsData.applicationsByStatus;
    const total = Object.values(statusData).reduce(
      (sum, count) => sum + count,
      0
    );

    if (total === 0) {
      this.statusChart.innerHTML = `
      <div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div class="text-center">
          <span class="material-symbols-outlined text-4xl mb-2 opacity-50">pie_chart</span>
          <p>No data available</p>
        </div>
      </div>
    `;
      return;
    }

    const colors = {
      pending: "#f59e0b",
      shortlisted: "#3b82f6",
      accepted: "#10b981",
      rejected: "#ef4444",
    };

    const statusLabels = {
      pending: "Pending",
      shortlisted: "Shortlisted",
      accepted: "Accepted",
      rejected: "Rejected",
    };

    // Calculate percentages and angles
    const slices = Object.entries(statusData)
      .filter(([_, count]) => count > 0)
      .map(([status, count]) => {
        const percentage = (count / total) * 100;
        return { status, count, percentage };
      });

    // Sort by count descending for better visual arrangement
    slices.sort((a, b) => b.count - a.count);

    let currentAngle = 0;
    const radius = 70;
    const centerX = 120;
    const centerY = 100;
    const svgWidth = 300;
    const svgHeight = 200;

    this.statusChart.innerHTML = `
      <svg viewBox="0 0 ${svgWidth} ${svgHeight}" class="w-full h-full" preserveAspectRatio="xMidYMid meet">
        <!-- Pie Chart -->
        ${slices
          .map(({ status, count, percentage }) => {
            const angle = (count / total) * 360;
            const largeArcFlag = angle > 180 ? 1 : 0;

            const x1 =
              centerX + radius * Math.cos((currentAngle * Math.PI) / 180);
            const y1 =
              centerY + radius * Math.sin((currentAngle * Math.PI) / 180);
            const x2 =
              centerX +
              radius * Math.cos(((currentAngle + angle) * Math.PI) / 180);
            const y2 =
              centerY +
              radius * Math.sin(((currentAngle + angle) * Math.PI) / 180);

            const path = `
              M ${centerX} ${centerY}
              L ${x1} ${y1}
              A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}
              Z
            `;

            // Calculate label position (middle of the slice)
            const midAngle = currentAngle + angle / 2;
            const labelRadius = radius * 0.6;
            const labelX =
              centerX + labelRadius * Math.cos((midAngle * Math.PI) / 180);
            const labelY =
              centerY + labelRadius * Math.sin((midAngle * Math.PI) / 180);

            const slice = `
              <g>
                <path d="${path}" fill="${colors[status]}" 
                      class="pie-slice opacity-80 hover:opacity-100 transition-all duration-200 cursor-pointer"
                      data-status="${status}" data-count="${count}" data-percentage="${percentage.toFixed(
              1
            )}"/>
                
                <!-- Percentage label inside slice (only show if slice is large enough) -->
                ${
                  angle > 15
                    ? `
                  <text x="${labelX}" y="${labelY}" 
                        text-anchor="middle" dominant-baseline="middle"
                        class="percentage-label text-xs font-semibold fill-white pointer-events-none">
                    ${percentage.toFixed(0)}%
                  </text>
                `
                    : ""
                }
              </g>
            `;

            currentAngle += angle;
            return slice;
          })
          .join("")}
        
        <!-- Center total -->
        <circle cx="${centerX}" cy="${centerY}" r="${
      radius * 0.3
    }" fill="white" class="dark:fill-gray-800"/>
        <text x="${centerX}" y="${centerY - 5}" 
              text-anchor="middle" class="text-sm font-bold fill-gray-700 dark:fill-gray-300">
          ${total}
        </text>
        <text x="${centerX}" y="${centerY + 10}" 
              text-anchor="middle" class="text-xs fill-gray-500 dark:fill-gray-400">
          Total
        </text>
        
        <!-- Legend - Positioned to the right with better spacing -->
        <g transform="translate(180, 20)">
          ${slices
            .map(({ status, count, percentage }, index) => {
              const y = index * 28;
              const displayPercentage = percentage.toFixed(1);

              return `
              <g transform="translate(0, ${y})" class="legend-item cursor-pointer" data-status="${status}">
                <!-- Color indicator -->
                <rect width="14" height="14" fill="${colors[status]}" rx="3" class="shadow-sm legend-color"/>
                
                <!-- Status label -->
                <text x="22" y="11" class="text-sm font-medium fill-gray-700 dark:fill-gray-300 legend-text">
                  ${statusLabels[status]}
                </text>
                
                <!-- Count and percentage -->
                <text x="22" y="26" class="text-xs fill-gray-500 dark:fill-gray-400 legend-details">
                  ${count} (${displayPercentage}%)
                </text>
              </g>
            `;
            })
            .join("")}
        </g>
      </svg>
    `;

    // Add interactivity
    this.addPieChartInteractivity();
  }

  addPieChartInteractivity() {
    const slices = this.statusChart.querySelectorAll(".pie-slice");
    const legendItems = this.statusChart.querySelectorAll(".legend-item");

    const statusLabels = {
      pending: "Pending",
      shortlisted: "Shortlisted",
      accepted: "Accepted",
      rejected: "Rejected",
    };

    const colors = {
      pending: "#f59e0b",
      shortlisted: "#3b82f6",
      accepted: "#10b981",
      rejected: "#ef4444",
    };

    // Function to highlight a specific slice
    const highlightSlice = (status, highlight = true) => {
      const slice = this.statusChart.querySelector(
        `.pie-slice[data-status="${status}"]`
      );
      const legendItem = this.statusChart.querySelector(
        `.legend-item[data-status="${status}"]`
      );
      const legendColor = legendItem?.querySelector(".legend-color");
      const legendText = legendItem?.querySelector(".legend-text");
      const legendDetails = legendItem?.querySelector(".legend-details");

      if (slice) {
        if (highlight) {
          slice.style.opacity = "1";
          slice.style.filter = "drop-shadow(0 0 8px rgba(0,0,0,0.3))";
          slice.style.transform = "scale(1.05)";
          slice.style.transformOrigin = "center";
        } else {
          slice.style.opacity = "0.8";
          slice.style.filter = "none";
          slice.style.transform = "scale(1)";
        }
      }

      if (legendItem && legendColor && legendText && legendDetails) {
        if (highlight) {
          legendColor.style.filter = "brightness(1.2)";
          legendText.style.fontWeight = "bold";
          legendDetails.style.fontWeight = "600";
        } else {
          legendColor.style.filter = "none";
          legendText.style.fontWeight = "normal";
          legendDetails.style.fontWeight = "normal";
        }
      }
    };

    // Function to show tooltip
    const showTooltip = (event, status, count, percentage) => {
      // Remove existing tooltip
      const existingTooltip = this.statusChart.querySelector(".pie-tooltip");
      if (existingTooltip) {
        existingTooltip.remove();
      }

      // Create tooltip
      const tooltip = document.createElement("div");
      tooltip.className =
        "pie-tooltip absolute bg-gray-900 dark:bg-gray-700 text-white text-xs rounded-lg px-3 py-2 shadow-lg z-10";
      tooltip.innerHTML = `
        <div class="font-semibold">${statusLabels[status]}</div>
        <div>${count} applications (${percentage}%)</div>
      `;

      // Position tooltip near cursor
      const rect = this.statusChart.getBoundingClientRect();
      tooltip.style.left = `${event.clientX - rect.left + 10}px`;
      tooltip.style.top = `${event.clientY - rect.top - 40}px`;

      this.statusChart.style.position = "relative";
      this.statusChart.appendChild(tooltip);
    };

    // Function to hide tooltip
    const hideTooltip = () => {
      const tooltip = this.statusChart.querySelector(".pie-tooltip");
      if (tooltip) {
        tooltip.remove();
      }
    };

    // Add event listeners to pie slices
    slices.forEach((slice) => {
      slice.addEventListener("mouseenter", (e) => {
        const status = e.target.getAttribute("data-status");
        const count = e.target.getAttribute("data-count");
        const percentage = e.target.getAttribute("data-percentage");

        highlightSlice(status, true);
        showTooltip(e, status, count, percentage);
      });

      slice.addEventListener("mouseleave", (e) => {
        const status = e.target.getAttribute("data-status");
        highlightSlice(status, false);
        hideTooltip();
      });

      slice.addEventListener("click", (e) => {
        const status = e.target.getAttribute("data-status");
        const count = e.target.getAttribute("data-count");
        const percentage = e.target.getAttribute("data-percentage");

        // Show notification about the slice
        if (typeof showNotification === "function") {
          showNotification(
            `<strong>${statusLabels[status]}</strong><br>${count} applications (${percentage}%)`,
            "info",
            3000
          );
        }

        // You could also filter the data based on the clicked status
        console.log(`Clicked on ${status}: ${count} applications`);
      });
    });

    // Add event listeners to legend items
    legendItems.forEach((legendItem) => {
      legendItem.addEventListener("mouseenter", (e) => {
        const status = e.currentTarget.getAttribute("data-status");
        const slice = this.statusChart.querySelector(
          `.pie-slice[data-status="${status}"]`
        );
        if (slice) {
          const count = slice.getAttribute("data-count");
          const percentage = slice.getAttribute("data-percentage");
          highlightSlice(status, true);
          showTooltip(e, status, count, percentage);
        }
      });

      legendItem.addEventListener("mouseleave", (e) => {
        const status = e.currentTarget.getAttribute("data-status");
        highlightSlice(status, false);
        hideTooltip();
      });

      legendItem.addEventListener("click", (e) => {
        const status = e.currentTarget.getAttribute("data-status");
        const slice = this.statusChart.querySelector(
          `.pie-slice[data-status="${status}"]`
        );
        if (slice) {
          const count = slice.getAttribute("data-count");
          const percentage = slice.getAttribute("data-percentage");

          if (typeof showNotification === "function") {
            showNotification(
              `<strong>${statusLabels[status]}</strong><br>${count} applications (${percentage}%)`,
              "info",
              3000
            );
          }

          console.log(`Clicked legend for ${status}: ${count} applications`);
        }
      });
    });

    // Add CSS for smooth transitions
    if (!document.querySelector("#pie-chart-styles")) {
      const styles = document.createElement("style");
      styles.id = "pie-chart-styles";
      styles.textContent = `
        .pie-slice {
          transition: all 0.3s ease;
        }
        .legend-item {
          transition: all 0.2s ease;
        }
        .legend-item:hover .legend-color {
          filter: brightness(1.2);
        }
        .legend-item:hover .legend-text {
          font-weight: 600;
        }
        .pie-tooltip {
          animation: fadeIn 0.2s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(5px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `;
      document.head.appendChild(styles);
    }
  }
  /**
   * Renders a bar chart showing the top courses by number of applications
   * with acceptance rate information
   */
  /**
 * Renders a bar chart showing the top courses by number of applications
 * with acceptance rate information
 */
renderCourseChart() {
    // Check if chart container element exists
    if (!this.courseChart) return;

    // Get course data from analytics
    const courseApplicationsData = this.analyticsData.applicationsByCourse;
    
    // Extract top 5 courses with most applications
    const topCourses = Object.keys(courseApplicationsData).slice(0, 5);

    // Display message if no course data available
    if (topCourses.length === 0) {
        this.courseChart.innerHTML = `
            <div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div class="text-center">
                    <span class="material-symbols-outlined text-4xl mb-2 opacity-50">bar_chart</span>
                    <p>No course data available</p>
                </div>
            </div>
        `;
        return;
    }

    // Calculate maximum number of applications for scaling
    const maxApplicationCount = Math.max(
        ...topCourses.map((courseName) => courseApplicationsData[courseName].count),
        1 // Ensure at least 1 to avoid division by zero
    );

    // Improved chart dimensions and layout
    const chartHeight = 200; // Increased height for better visibility
    const chartWidth = 400;  // Increased width
    const chartMargins = { top: 40, right: 30, bottom: 80, left: 60 }; // Better margins
    const plotAreaWidth = chartWidth - chartMargins.left - chartMargins.right;
    const barWidth = Math.min(50, plotAreaWidth / topCourses.length - 15); // Wider bars

    // Generate SVG chart content
    this.courseChart.innerHTML = `
        <svg viewBox="0 0 ${chartWidth} ${chartHeight + 40}" class="w-full h-full" preserveAspectRatio="xMidYMid meet">
            
            <!-- Chart background -->
            <rect x="0" y="0" width="${chartWidth}" height="${chartHeight + 40}" 
                  fill="transparent" />
            
            <!-- Chart title with better styling -->
            <text x="${chartWidth / 2}" y="25" text-anchor="middle" 
                  class="text-sm font-semibold fill-gray-800 dark:fill-gray-200">
                Top Courses by Applications
            </text>
            
            <!-- Vertical Y-axis line -->
            <line x1="${chartMargins.left}" y1="${chartMargins.top}" 
                  x2="${chartMargins.left}" y2="${chartHeight}" 
                  stroke="#d1d5db" stroke-width="1.5" class="dark:stroke-gray-600"/>
            
            <!-- Horizontal X-axis line -->
            <line x1="${chartMargins.left}" y1="${chartHeight}" 
                  x2="${chartWidth - chartMargins.right}" y2="${chartHeight}" 
                  stroke="#d1d5db" stroke-width="1.5" class="dark:stroke-gray-600"/>
            
            <!-- Generate bars for each course -->
            ${topCourses
                .map((courseName, courseIndex) => {
                    const courseInfo = courseApplicationsData[courseName];
                    const applicationCount = courseInfo.count;
                    const acceptedCount = courseInfo.accepted;
                    
                    // Calculate acceptance rate percentage
                    const acceptanceRatePercentage = acceptedCount > 0
                        ? (acceptedCount / applicationCount) * 100
                        : 0;

                    // Calculate bar dimensions based on application count
                    const maxBarHeight = chartHeight - chartMargins.top - chartMargins.bottom - 20;
                    const barHeight = (applicationCount / maxApplicationCount) * maxBarHeight;
                    
                    // Calculate bar position
                    const barSpacing = plotAreaWidth / topCourses.length;
                    const barXPosition = chartMargins.left + (courseIndex * barSpacing) + (barSpacing - barWidth) / 2;
                    const barYPosition = chartHeight - barHeight - chartMargins.bottom;

                    // Shorten long course names for display with better truncation
                    const displayCourseName = courseName.length > 15 
                        ? courseName.substring(0, 15) + "..." 
                        : courseName;

                    // Color based on acceptance rate (green for high acceptance)
                    const barColor = acceptanceRatePercentage >= 50 ? "#10b981" : 
                                   acceptanceRatePercentage >= 25 ? "#8b5cf6" : "#ef4444";

                    return `
                        <g class="cursor-pointer hover:opacity-80 transition-opacity" 
                           data-course="${courseName}">
                            
                            <!-- Main bar representing application count -->
                            <rect x="${barXPosition}" y="${barYPosition}" 
                                  width="${barWidth}" height="${barHeight}" 
                                  fill="${barColor}" class="opacity-90 rounded-t-sm" 
                                  rx="3" ry="3"
                                  data-course="${courseName}" 
                                  data-applications="${applicationCount}" 
                                  data-acceptance="${acceptanceRatePercentage.toFixed(1)}%"/>
                            
                            <!-- Display application count above bar -->
                            <text x="${barXPosition + barWidth / 2}" y="${barYPosition - 10}" 
                                  text-anchor="middle" 
                                  class="text-xs font-semibold fill-gray-700 dark:fill-gray-300">
                                ${applicationCount}
                            </text>
                            
                            <!-- Display acceptance rate below bar -->
                            <text x="${barXPosition + barWidth / 2}" y="${barYPosition + barHeight + 25}" 
                                  text-anchor="middle" 
                                  class="text-xs font-medium fill-green-600 dark:fill-green-400">
                                ${acceptanceRatePercentage.toFixed(0)}% accepted
                            </text>
                            
                            <!-- Display course name at bottom -->
                            <text x="${barXPosition + barWidth / 2}" y="${chartHeight + 15}" 
                                  text-anchor="middle" 
                                  class="text-xs fill-gray-600 dark:fill-gray-400 font-medium">
                                ${displayCourseName}
                            </text>
                            
                            <!-- Tooltip with full course information (shown on hover) -->
                            <title>
                                ${courseName}
                                Applications: ${applicationCount}
                                Accepted: ${acceptedCount}
                                Acceptance Rate: ${acceptanceRatePercentage.toFixed(1)}%
                            </title>
                        </g>
                    `;
                })
                .join("")}
            
            <!-- Y-axis scale labels -->
            ${[0, 0.25, 0.5, 0.75, 1]
                .map((scalePosition) => {
                    const scaleValue = Math.round(maxApplicationCount * scalePosition);
                    const labelYPosition = chartHeight - 
                                         scalePosition * (chartHeight - chartMargins.top - chartMargins.bottom - 20) - 
                                         chartMargins.bottom;

                    return `
                        <g>
                            <!-- Tick mark -->
                            <line x1="${chartMargins.left - 5}" y1="${labelYPosition}" 
                                  x2="${chartMargins.left}" y2="${labelYPosition}" 
                                  stroke="#9ca3af" stroke-width="1" class="dark:stroke-gray-500"/>
                            
                            <!-- Grid line -->
                            <line x1="${chartMargins.left}" y1="${labelYPosition}" 
                                  x2="${chartWidth - chartMargins.right}" y2="${labelYPosition}" 
                                  stroke="#f3f4f6" stroke-width="1" class="dark:stroke-gray-700"/>
                            
                            <!-- Scale value -->
                            <text x="${chartMargins.left - 10}" y="${labelYPosition + 4}" 
                                  text-anchor="end" 
                                  class="text-xs fill-gray-500 dark:fill-gray-400 font-medium">
                                ${scaleValue}
                            </text>
                        </g>
                    `;
                })
                .join("")}
            
            <!-- Y-axis title (rotated) -->
            <text x="${chartMargins.left - 35}" y="${chartHeight / 2}" text-anchor="middle" 
                  transform="rotate(-90 ${chartMargins.left - 35} ${chartHeight / 2})" 
                  class="text-xs fill-gray-600 dark:fill-gray-400 font-semibold">
                Number of Applications
            </text>
            
            <!-- X-axis title -->
            <text x="${chartWidth / 2}" y="${chartHeight + 45}" text-anchor="middle" 
                  class="text-xs fill-gray-600 dark:fill-gray-400 font-semibold">
                Courses
            </text>
        </svg>
    `;

    // Add interactive features like tooltips and click handlers
    this.addCourseChartInteractivity();
}

/**
 * Adds interactivity to the course chart
 */
addCourseChartInteractivity() {
    // Add click handlers to bars
    const bars = this.courseChart.querySelectorAll('rect[data-course]');
    bars.forEach(bar => {
        bar.addEventListener('click', (event) => {
            const course = event.target.getAttribute('data-course');
            const applications = event.target.getAttribute('data-applications');
            const acceptance = event.target.getAttribute('data-acceptance');
            
            console.log(`Course: ${course}, Applications: ${applications}, Acceptance: ${acceptance}`);
            // You can add more interactive behavior here
        });
    });
    
    // Add hover effects
    bars.forEach(bar => {
        bar.addEventListener('mouseenter', (event) => {
            event.target.style.opacity = '0.7';
        });
        
        bar.addEventListener('mouseleave', (event) => {
            event.target.style.opacity = '0.9';
        });
    });
}
  renderInstitutionChart() {
    if (!this.institutionChart) return;

    const institutionData = this.analyticsData.applicationsByInstitution;
    const institutions = Object.keys(institutionData).slice(0, 5); // Top 5 institutions

    this.institutionChart.innerHTML = `
      <div class="space-y-3 h-64 overflow-y-auto">
        ${institutions
          .map((institution) => {
            const data = institutionData[institution];
            const acceptanceRate =
              data.count > 0 ? (data.accepted / data.count) * 100 : 0;
            const completionRate =
              data.accepted > 0 ? (data.completed / data.accepted) * 100 : 0;

            return `
            <div class="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div class="flex-1">
                <p class="text-sm font-medium text-gray-900 dark:text-white">${institution}</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">${
                  data.count
                } applications</p>
              </div>
              <div class="text-right">
                <p class="text-sm font-medium text-green-600 dark:text-green-400">${acceptanceRate.toFixed(
                  1
                )}%</p>
                <p class="text-xs text-gray-500 dark:text-gray-400">Acceptance</p>
              </div>
            </div>
          `;
          })
          .join("")}
        
        ${
          institutions.length === 0
            ? `
          <div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
            <div class="text-center">
              <span class="material-symbols-outlined text-4xl mb-2 opacity-50">compare</span>
              <p>No institution data</p>
            </div>
          </div>
        `
            : ""
        }
      </div>
    `;
  }

  renderCoursePerformance() {
    if (!this.coursePerformanceBody) return;

    const courseData = this.analyticsData.applicationsByCourse;
    const courses = Object.entries(courseData)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5); // Top 5 courses

    if (courses.length === 0) {
      this.coursePerformanceBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center py-8 text-gray-500 dark:text-gray-400">
            <span class="material-symbols-outlined text-4xl mb-2 opacity-50">school</span>
            <p>No course data available</p>
          </td>
        </tr>
      `;
      return;
    }

    this.coursePerformanceBody.innerHTML = courses
      .map(([course, data]) => {
        const acceptanceRate =
          data.count > 0 ? (data.accepted / data.count) * 100 : 0;
        const completionRate =
          data.accepted > 0 ? (data.completed / data.accepted) * 100 : 0;
        const avgDuration =
          data.durationCount > 0 ? data.totalDuration / data.durationCount : 0;

        return `
        <tr class="border-b border-gray-200 dark:border-gray-700">
          <td class="py-3 text-sm text-gray-900 dark:text-white">${course}</td>
          <td class="py-3 text-sm text-gray-600 dark:text-gray-400">${
            data.count
          }</td>
          <td class="py-3 text-sm font-medium ${
            acceptanceRate >= 50
              ? "text-green-600 dark:text-green-400"
              : "text-orange-600 dark:text-orange-400"
          }">
            ${acceptanceRate.toFixed(1)}%
          </td>
          <td class="py-3 text-sm font-medium ${
            completionRate >= 80
              ? "text-green-600 dark:text-green-400"
              : "text-orange-600 dark:text-orange-400"
          }">
            ${completionRate.toFixed(1)}%
          </td>
          <td class="py-3 text-sm text-gray-600 dark:text-gray-400">${avgDuration.toFixed(
            0
          )} days</td>
        </tr>
      `;
      })
      .join("");
  }

  renderPerformanceInsights() {
    if (!this.insightsList) return;

    const metrics = this.analyticsData.trainingMetrics;
    const courseData = this.analyticsData.applicationsByCourse;
    const insights = [];

    // Generate insights based on data
    if (metrics.acceptanceRate < 20) {
      insights.push({
        type: "warning",
        icon: "warning",
        title: "Low Acceptance Rate",
        description:
          "Consider reviewing your application criteria or outreach strategy.",
        suggestion: "Focus on quality applications over quantity.",
      });
    }

    if (metrics.completionRate > 90) {
      insights.push({
        type: "success",
        icon: "check_circle",
        title: "High Completion Rate",
        description: "Excellent trainee retention and program effectiveness.",
        suggestion: "Consider expanding successful program elements.",
      });
    }

    // Find top performing course
    const topCourse = Object.entries(courseData).sort(
      (a, b) => b[1].accepted - a[1].accepted
    )[0];

    if (topCourse && topCourse[1].accepted > 0) {
      insights.push({
        type: "info",
        icon: "star",
        title: "Top Performing Course",
        description: `${topCourse[0]} has the highest number of accepted applications.`,
        suggestion: "Leverage this success in marketing efforts.",
      });
    }

    if (insights.length === 0) {
      insights.push({
        type: "info",
        icon: "insights",
        title: "Collecting Data",
        description:
          "Continue tracking applications and training progress for more insights.",
        suggestion: "Regularly review analytics for performance trends.",
      });
    }

    this.insightsList.innerHTML = insights
      .map((insight) => {
        const colorClasses = {
          warning:
            "bg-orange-50 border-orange-200 dark:bg-orange-900/20 dark:border-orange-700",
          success:
            "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-700",
          info: "bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700",
        };

        const iconColors = {
          warning: "text-orange-600 dark:text-orange-400",
          success: "text-green-600 dark:text-green-400",
          info: "text-blue-600 dark:text-blue-400",
        };

        return `
        <div class="p-4 rounded-lg border ${colorClasses[insight.type]}">
          <div class="flex items-start gap-3">
            <div class="p-2 rounded-lg ${
              iconColors[insight.type]
            } bg-white dark:bg-gray-800">
              <span class="material-symbols-outlined text-base">${
                insight.icon
              }</span>
            </div>
            <div class="flex-1">
              <h4 class="text-sm font-semibold text-gray-900 dark:text-white mb-1">${
                insight.title
              }</h4>
              <p class="text-sm text-gray-600 dark:text-gray-400 mb-2">${
                insight.description
              }</p>
              <p class="text-xs text-gray-500 dark:text-gray-500 font-medium">${
                insight.suggestion
              }</p>
            </div>
          </div>
        </div>
      `;
      })
      .join("");
  }

  exportAnalytics() {
    console.log("Exporting analytics report");

    if (this.analyticsData.totalApplications === 0) {
      showNotification("No data to export", "warning");
      return;
    }

    try {
      const loadingNotification = showNotification(
        "Preparing analytics export...",
        "loading",
        0
      );

      const csvContent = this.generateAnalyticsCSV();
      const filename = `analytics_report_${this.currentPeriod}_${
        new Date().toISOString().split("T")[0]
      }.csv`;

      this.downloadCSV(csvContent, filename);

      updateNotification(
        loadingNotification,
        "Analytics report exported successfully!",
        "success"
      );

      setTimeout(() => removeNotification(loadingNotification), 3000);
    } catch (error) {
      console.error("Export error:", error);
      showNotification(`Export failed: ${error.message}`, "error");
    }
  }

  generateAnalyticsCSV() {
    const headers = ["Metric", "Value", "Period", "Generated Date"];

    const metrics = this.analyticsData.trainingMetrics;
    const rows = [
      [
        "Total Applications",
        this.analyticsData.totalApplications,
        this.currentPeriod,
        new Date().toISOString(),
      ],
      [
        "Acceptance Rate",
        `${metrics.acceptanceRate.toFixed(1)}%`,
        this.currentPeriod,
        "",
      ],
      [
        "Completion Rate",
        `${metrics.completionRate.toFixed(1)}%`,
        this.currentPeriod,
        "",
      ],
      [
        "Average Duration",
        `${metrics.avgDuration.toFixed(0)} days`,
        this.currentPeriod,
        "",
      ],
      ["Total Trainees", metrics.totalTrainees, this.currentPeriod, ""],
      ["Completed Trainees", metrics.completedTrainees, this.currentPeriod, ""],
      ["", "", "", ""],
      ["Status Breakdown", "", "", ""],
      [
        "Pending",
        this.analyticsData.applicationsByStatus.pending,
        this.currentPeriod,
        "",
      ],
      [
        "Shortlisted",
        this.analyticsData.applicationsByStatus.shortlisted,
        this.currentPeriod,
        "",
      ],
      [
        "Accepted",
        this.analyticsData.applicationsByStatus.accepted,
        this.currentPeriod,
        "",
      ],
      [
        "Rejected",
        this.analyticsData.applicationsByStatus.rejected,
        this.currentPeriod,
        "",
      ],
    ];

    // Add course performance data
    rows.push(["", "", "", ""], ["Course Performance", "", "", ""]);
    Object.entries(this.analyticsData.applicationsByCourse)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .forEach(([course, data]) => {
        const acceptanceRate =
          data.count > 0 ? (data.accepted / data.count) * 100 : 0;
        rows.push([
          course,
          data.count,
          `${acceptanceRate.toFixed(1)}% acceptance`,
          "",
        ]);
      });

    const csvArray = [headers, ...rows];
    return csvArray
      .map((row) =>
        row
          .map((field) => {
            if (field === null || field === undefined) return "";
            const stringField = String(field);
            if (
              stringField.includes(",") ||
              stringField.includes('"') ||
              stringField.includes("\n")
            ) {
              return `"${stringField.replace(/"/g, '""')}"`;
            }
            return stringField;
          })
          .join(",")
      )
      .join("\n");
  }

  downloadCSV(csvContent, filename) {
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], {
      type: "text/csv;charset=utf-8;",
    });

    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);

    link.setAttribute("href", url);
    link.setAttribute("download", filename);
    link.style.visibility = "hidden";

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    URL.revokeObjectURL(url);
  }
}
