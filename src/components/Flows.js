import React, { useCallback } from 'react';
import { Button, FormControl } from 'react-bootstrap';
import checkSquare from '../assets/check-square.svg';
import square from '../assets/square.svg';
import moment from 'moment';
import { useFlowsData } from '../hooks/useFlowsData';
import { useCollapsible } from '../hooks/useCollapsible';

const Flows = React.memo(() => {
	const flowsData = useFlowsData();
	const { toggleVisibility, toggleAll } = useCollapsible();

	const handleSearchChange = useCallback((event) => {
		flowsData.setFilters(prevFilters => ({
			...prevFilters,
			searchTerm: event.target.value,
		}));
	}, [flowsData]);

	const handleFilterToggle = useCallback((filterName) => {
		flowsData.setFilters(prevFilters => ({
			...prevFilters,
			[filterName]: !prevFilters[filterName],
		}));
	}, [flowsData]);

	const renderFiltersColumn = useCallback(() => {
		return (
			<div className="filtersRow">
				<div className="search-input-container">
					<svg
						aria-hidden="true"
						height="16"
						viewBox="0 0 16 16"
						version="1.1"
						width="16"
						data-view-component="true"
						className="search-icon"
					>
						<path
							fillRule="evenodd"
							d="M11.5 7a4.499 4.499 0 11-8.998 0A4.499 4.499 0 0111.5 7zm-.82 4.74a6 6 0 111.06-1.06l3.04 3.04a.75.75 0 11-1.06 1.06l-3.04-3.04z"
						/>
					</svg>
					<FormControl
						className="search-input"
						type="text"
						value={flowsData.filters.searchTerm}
						onChange={handleSearchChange}
					/>
				</div>
				<Button
					variant="dark"
					className="filter-btn"
					onClick={() => handleFilterToggle('active')}
				>
					<img
						src={flowsData.filters.active ? checkSquare : square}
						width={16}
						height={16}
						alt="checkbox"
					/>{' '}
					active
				</Button>
				<Button
					variant="dark"
					className="filter-btn"
					onClick={() => handleFilterToggle('skipped')}
				>
					<img
						src={flowsData.filters.skipped ? checkSquare : square}
						width={16}
						height={16}
						alt="checkbox"
					/>{' '}
					skipped
				</Button>
			</div>
		);
	}, [flowsData.filters, handleSearchChange, handleFilterToggle]);

	const renderTags = useCallback((tags) => {
		tags = tags || [];
		return tags.map((tag, index) => (
			<span key={index} className="label label-status-neutral">
				{tag}
			</span>
		));
	}, []);

	const renderExpandCollapseButtons = useCallback(() => {
		return (
			<div className="expand-collapse-buttons">
				<Button variant="dark" className="filter-btn" onClick={() => toggleAll(true)}>
					Expand all
				</Button>
				<Button variant="dark" className="filter-btn" onClick={() => toggleAll(false)}>
					Collapse all
				</Button>
			</div>
		);
	}, [toggleAll]);

	const renderFlowsList = useCallback((flows) => {
		const fileUrl = `https://github.com/woocommerce/woocommerce/blob/${flowsData.sha}/plugins/woocommerce/tests/e2e-pw/tests/`;
		const skippedPill = <span className="label label-status-skipped">SKIPPED</span>;

		return (
			<ul className="flowsList">
				{flows.map((flow, flowIndex) => (
					<li className={flow.skipped ? 'skipped-flow' : ''} key={flowIndex}>
						<a
							className="flowLink"
							href={fileUrl + flow.file + '#L' + flow.line}
							target="_blank"
							rel="noreferrer"
						>
							{flow.skipped ? skippedPill : ''} {flow.title}
						</a>{' '}
						{renderTags(flow.tags)}
						<br />
						<small className="flowMetaData">
							{flow.file}:{flow.line}
						</small>
					</li>
				))}
			</ul>
		);
	}, [flowsData.sha, renderTags]);

	const renderSuites = useCallback((suites, parentIndex = '') => {
		return (
			<ul className="suitesList">
				{Object.entries(suites).map(([suiteName, suiteData], index) => {
					const suiteIndex = `${parentIndex}${index}`;

					return (
						<li key={suiteIndex} className="groupTitle suiteElement">
							<div
								className="suiteTitleContainer"
								onClick={() => toggleVisibility(suiteIndex)}
								role="button"
								tabIndex={0}
								onKeyPress={e => {
									if (e.key === 'Enter') {
										toggleVisibility(suiteIndex);
									}
								}}
							>
								<span className="suiteTitle">{suiteName}</span>
								<svg
									xmlns="http://www.w3.org/2000/svg"
									width="48"
									height="32"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									className="collapse-indicator collapsed"
									id={`btn-${suiteIndex}`}
								>
									<polyline points="9 6 15 12 9 18" />
								</svg>
							</div>
							<div id={`suite-${suiteIndex}`}>
								{suiteData.flows && renderFlowsList(suiteData.flows)}
								{Object.entries(suiteData).filter(([key]) => key !== 'flows').length > 0 &&
									renderSuites(
										Object.fromEntries(
											Object.entries(suiteData).filter(([key]) => key !== 'flows')
										),
										`${suiteIndex}-`
									)}
							</div>
						</li>
					);
				})}
			</ul>
		);
	}, [toggleVisibility, renderFlowsList]);

	if (!flowsData.isDataReady) {
		return null;
	}

	return (
		<div>
			<div className="row headerRow">
				<div className="col">
					<span>{flowsData.count} flows</span>
					<br />
					<span className="caption">
						commit {flowsData.sha.substring(0, 6)}, updated{' '}
						{moment(flowsData.lastUpdate).fromNow()}
					</span>
				</div>
				<div className="col filters right-align">{renderFiltersColumn()}</div>
			</div>
			{renderExpandCollapseButtons()}
			{renderSuites(flowsData.flows)}
		</div>
	);
});

Flows.displayName = 'Flows';

export default Flows;
