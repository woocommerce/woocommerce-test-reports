import { useState, useEffect, useMemo } from 'react';
import { sortArray } from '../utils/sort';
import { getDataSourceUrl } from '../config';

export function useSummaryData() {
	const [rawData, setRawData] = useState({
		dailyData: [],
		weeklyData: [],
		monthlyData: [],
		summaryData: {},
		failureRatesData: [],
	});
	const [isTrunkOnly, setIsTrunkOnly] = useState(true);
	const [isDataReady, setIsDataReady] = useState(false);

	useEffect(() => {
		const fetchData = async () => {
			const headers = {
				'Content-Type': 'application/json',
				Accept: 'application/json',
			};

			try {
				const [
					summaryResponse,
					dailyResponse,
					weeklyResponse,
					monthlyResponse,
					failureRatesResponse,
				] = await Promise.all([
					fetch(`${getDataSourceUrl()}/data/summary.json`, { headers }),
					fetch(`${getDataSourceUrl()}/data/runs-daily.json`, { headers }),
					fetch(`${getDataSourceUrl()}/data/runs-weekly.json`, { headers }),
					fetch(`${getDataSourceUrl()}/data/runs-monthly.json`, { headers }),
					fetch(`${getDataSourceUrl()}/data/failure-rates.json`, { headers }),
				]);

				const [summaryData, dailyData, weeklyData, monthlyData, failureRatesData] =
					await Promise.all([
						summaryResponse.json(),
						dailyResponse.json(),
						weeklyResponse.json(),
						monthlyResponse.json(),
						failureRatesResponse.json(),
					]);

				setRawData({
					summaryData,
					dailyData,
					weeklyData,
					monthlyData,
					failureRatesData,
				});

				setIsDataReady(true);
			} catch (error) {
				console.error(error);
			}
		};

		fetchData();
	}, []);

	const processedData = useMemo(() => {
		if (!isDataReady) {
			return {
				days: [],
				weeks: [],
				months: [],
				summary: {},
				failureRates: [],
			};
		}

		const filterDataSet = (rawData) => {
			let filteredEntries = [];

			if (isTrunkOnly) {
				filteredEntries = rawData.map(entry => ({
					...entry.trunk,
					date: entry.date,
				}));
			} else {
				filteredEntries = rawData.map(entry => ({
					...entry.total,
					date: entry.date,
				}));
			}

			sortArray(filteredEntries, 'date', false);
			return filteredEntries;
		};

		const filterSummaryData = () => {
			const summaryData = {};

			if (isTrunkOnly) {
				Object.keys(rawData.summaryData.stats).forEach(key => {
					summaryData[key] = rawData.summaryData.stats[key].trunk;
				});
			} else {
				Object.keys(rawData.summaryData.stats).forEach(key => {
					summaryData[key] = rawData.summaryData.stats[key].total;
				});
			}

			return summaryData;
		};

		const processFailuresRatesData = () => {
			const data = [...rawData.failureRatesData];
			data.sort((a, b) => a.date.localeCompare(b.date));
			return data;
		};

		return {
			days: filterDataSet(rawData.dailyData),
			weeks: filterDataSet(rawData.weeklyData),
			months: filterDataSet(rawData.monthlyData),
			summary: filterSummaryData(),
			failureRates: processFailuresRatesData(),
			lastUpdate: rawData.summaryData.lastUpdate,
		};
	}, [rawData, isTrunkOnly, isDataReady]);

	return {
		...processedData,
		isTrunkOnly,
		setIsTrunkOnly,
		isDataReady,
	};
}