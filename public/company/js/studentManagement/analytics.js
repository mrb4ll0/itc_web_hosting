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
      const itemDate = new Date(
        item.application.submittedAt || item.application.createdAt
      );
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
      const status = item.application.status || "pending";
      if (statusCounts[status] !== undefined) {
        statusCounts[status]++;
      }
    });

    return statusCounts;
  }

  groupByCourse(data) {
    const courseData = {};

    data.forEach((item) => {
      const course = item.opportunity?.course || "Unknown Course";
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

      if (item.application.status === "accepted") {
        courseData[course].accepted++;
      }

      // Calculate completion and duration for training metrics
      if (item.application.progress === 100) {
        courseData[course].completed++;
      }

      const duration = item.application.duration;
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
      const institution =
        item.opportunity?.institution || "Unknown Institution";
      if (!institutionData[institution]) {
        institutionData[institution] = {
          count: 0,
          accepted: 0,
          completed: 0,
        };
      }

      institutionData[institution].count++;

      if (item.application.status === "accepted") {
        institutionData[institution].accepted++;
      }

      if (item.application.progress === 100) {
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
      const itemDate = new Date(
        item.application.submittedAt || item.application.createdAt
      );
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
      (item) => item.application.status === "accepted"
    );
    metrics.totalTrainees = acceptedApplications.length;

    metrics.completedTrainees = acceptedApplications.filter(
      (item) => item.application.progress === 100
    ).length;

    // Calculate durations
    acceptedApplications.forEach((item) => {
      const duration = item.application.duration;
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
    // This would compare current period with previous period
    // For simplicity, we'll return some mock comparison data
    return {
      applicationsChange: 12.5, // percentage
      acceptanceChange: 3.2,
      completionChange: -2.1,
      durationChange: 1.5,
    };
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
    if (!this.applicationsChart) return;

    const timeData = this.analyticsData.applicationsOverTime;
    const labels = Object.keys(timeData);
    const values = Object.values(timeData);

    // If no data, show message
    if (labels.length === 0 || values.every((v) => v === 0)) {
      this.applicationsChart.innerHTML = `
      <div class="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
        <div class="text-center">
          <span class="material-symbols-outlined text-4xl mb-2 opacity-50">bar_chart</span>
          <p>No data available for selected period</p>
        </div>
      </div>
    `;
      return;
    }

    const maxValue = Math.max(...values, 1);
    const chartHeight = 160;
    const chartWidth = 380;
    const margin = { top: 20, right: 20, bottom: 40, left: 40 };

    // Calculate dynamic bar width based on number of data points
    const availableWidth = chartWidth - margin.left - margin.right;
    const barWidth = Math.max(
      8,
      Math.min(30, availableWidth / labels.length - 2)
    );

    // Only show every nth label to prevent overlapping
    const labelInterval = Math.max(1, Math.ceil(labels.length / 10));

    this.applicationsChart.innerHTML = `
    <svg viewBox="0 0 400 200" class="w-full h-full" preserveAspectRatio="xMidYMid meet">
      <!-- Y-axis line -->
      <line x1="${margin.left}" y1="${margin.top}" x2="${
      margin.left
    }" y2="${chartHeight}" stroke="#e5e7eb" class="dark:stroke-gray-600"/>
      
      <!-- X-axis line -->
      <line x1="${margin.left}" y1="${chartHeight}" x2="${
      chartWidth - margin.right
    }" y2="${chartHeight}" stroke="#e5e7eb" class="dark:stroke-gray-600"/>
      
      <!-- Bars -->
      ${values
        .map((value, index) => {
          if (value === 0) return "";

          const barHeight =
            (value / maxValue) * (chartHeight - margin.top - margin.bottom);
          const x = margin.left + index * (barWidth + 2);
          const y = chartHeight - barHeight - margin.bottom;

          return `
          <g>
            <rect x="${x}" y="${y}" width="${barWidth}" height="${barHeight}" 
                  fill="#3b82f6" class="opacity-80 hover:opacity-100 transition-opacity cursor-pointer"
                  data-value="${value}"/>
            
            <!-- Value label on top of bar -->
            <text x="${x + barWidth / 2}" y="${y - 5}" 
                  text-anchor="middle" class="text-xs fill-gray-700 dark:fill-gray-300 font-medium">
              ${value}
            </text>
          </g>
        `;
        })
        .join("")}
      
      <!-- X-axis labels (only show some to prevent overlapping) -->
      ${labels
        .map((label, index) => {
          if (index % labelInterval !== 0) return "";

          const x = margin.left + index * (barWidth + 2) + barWidth / 2;
          const y = chartHeight + 15;

          // Format date based on period
          let displayText;
          if (this.currentPeriod === "7d") {
            displayText = new Date(label).toLocaleDateString("en-US", {
              weekday: "short",
            });
          } else if (this.currentPeriod === "30d") {
            displayText = new Date(label).getDate();
          } else {
            displayText = new Date(label).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
            });
          }

          return `
          <text x="${x}" y="${y}" 
                text-anchor="middle" class="text-xs fill-gray-500 dark:fill-gray-400">
            ${displayText}
          </text>
        `;
        })
        .join("")}
      
      <!-- Y-axis labels -->
      ${[0, 0.25, 0.5, 0.75, 1]
        .map((ratio) => {
          const value = Math.round(maxValue * ratio);
          const y =
            chartHeight -
            ratio * (chartHeight - margin.top - margin.bottom) -
            margin.bottom;

          return `
          <g>
            <line x1="${margin.left - 5}" y1="${y}" x2="${
            margin.left
          }" y2="${y}" stroke="#e5e7eb" class="dark:stroke-gray-600"/>
            <text x="${margin.left - 8}" y="${y + 3}" 
                  text-anchor="end" class="text-xs fill-gray-500 dark:fill-gray-400">
              ${value}
            </text>
          </g>
        `;
        })
        .join("")}
    </svg>
  `;

    // Add hover effects
    this.addChartInteractivity();
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

    let currentAngle = 0;
    const radius = 80;
    const centerX = 150;
    const centerY = 100;

    this.statusChart.innerHTML = `
      <svg viewBox="0 0 300 200" class="w-full h-full">
        ${Object.entries(statusData)
          .map(([status, count]) => {
            if (count === 0) return "";

            const percentage = (count / total) * 100;
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

            const slice = `<path d="${path}" fill="${colors[status]}" class="opacity-80 hover:opacity-100 transition-opacity"/>`;

            currentAngle += angle;
            return slice;
          })
          .join("")}
        
        <!-- Legend -->
        <g transform="translate(200, 30)">
          ${Object.entries(statusData)
            .map(([status, count], index) => {
              if (count === 0) return "";
              const y = index * 25;
              const percentage = ((count / total) * 100).toFixed(1);

              return `
              <g transform="translate(0, ${y})">
                <rect width="12" height="12" fill="${colors[status]}" rx="2"/>
                <text x="20" y="10" class="text-sm fill-gray-700 dark:fill-gray-300">${statusLabels[status]}</text>
                <text x="120" y="10" class="text-sm fill-gray-500 dark:fill-gray-400">${count} (${percentage}%)</text>
              </g>
            `;
            })
            .join("")}
        </g>
      </svg>
    `;
  }

  renderCourseChart() {
    if (!this.courseChart) return;

    const courseData = this.analyticsData.applicationsByCourse;
    const courses = Object.keys(courseData).slice(0, 5); // Top 5 courses
    const maxApplications = Math.max(
      ...courses.map((course) => courseData[course].count),
      1
    );
    const chartHeight = 150;

    this.courseChart.innerHTML = `
      <svg viewBox="0 0 400 200" class="w-full h-full">
        ${courses
          .map((course, index) => {
            const applications = courseData[course].count;
            const acceptanceRate =
              courseData[course].accepted > 0
                ? (courseData[course].accepted / applications) * 100
                : 0;

            const barHeight = (applications / maxApplications) * chartHeight;
            const x = index * 70;
            const y = chartHeight - barHeight;

            return `
            <g transform="translate(${x}, 0)">
              <rect y="${y}" width="50" height="${barHeight}" 
                    fill="#8b5cf6" class="opacity-70 hover:opacity-100 transition-opacity"/>
              <text x="25" y="${chartHeight + 20}" text-anchor="middle" 
                    class="text-xs fill-gray-500 dark:fill-gray-400" transform="rotate(45 25 ${
                      chartHeight + 20
                    })">
                ${course.length > 10 ? course.substring(0, 10) + "..." : course}
              </text>
              <text x="25" y="${
                y - 5
              }" text-anchor="middle" class="text-xs fill-gray-700 dark:fill-gray-300">
                ${applications}
              </text>
              <text x="25" y="${
                y + 15
              }" text-anchor="middle" class="text-xs fill-green-600 dark:fill-green-400">
                ${acceptanceRate.toFixed(0)}%
              </text>
            </g>
          `;
          })
          .join("")}
        
        <line x1="0" y1="${chartHeight}" x2="400" y2="${chartHeight}" stroke="#e5e7eb" class="dark:stroke-gray-600"/>
      </svg>
    `;
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
    // Implement export functionality (CSV, PDF, etc.)
    const reportData = {
      period: this.currentPeriod,
      metrics: this.analyticsData.trainingMetrics,
      courses: this.analyticsData.applicationsByCourse,
      institutions: this.analyticsData.applicationsByInstitution,
      generatedAt: new Date().toISOString(),
    };

    console.log("Exporting analytics:", reportData);
    // Here you would typically generate and download a CSV or PDF report
    alert(
      "Analytics export functionality would generate a detailed report here."
    );
  }
}
