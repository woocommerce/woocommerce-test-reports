import React from 'react';

import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';
import { Navbar, Container, Nav } from 'react-bootstrap';
import { HashRouter, Route, Routes } from 'react-router-dom';
import logo from './assets/logo-white.svg';
import Summary from './components/Summary';
import Reports from './components/Reports';
import Flows from './components/Flows';
import Errors from './components/Errors';

function App() {
	const basename = '/woocommerce-test-reports';

	const reportRoutes = [
		{ path: '/pr', name: 'pull requests', event: 'pull_request' },
		{ path: '/pr/:groupKey', event: 'pull_request' },
		{ path: '/trunk', name: 'trunk', event: 'push' },
		{ path: '/trunk/:groupKey', event: 'push' },
		{ path: '/daily', name: 'daily', event: 'daily-checks,daily-e2e,nightly-checks' },
		{ path: '/daily/:groupKey', event: 'daily-checks,daily-e2e,nightly-checks' },
		{ path: '/releases', name: 'releases', event: 'release-checks' },
		{ path: '/releases/:groupKey', event: 'release-checks' },
		{ path: '/other', name: 'other', event: 'other' },
		{ path: '/other/:groupKey', event: 'other' },
	];

	return (
		<Container fluid className="App">
			<div className="App-content">
				<Navbar variant="dark" expand="md" className="app-nav-bar">
					<Container fluid className="app-nav-bar-inner-container">
						<Navbar.Brand href={ `${ basename }/#/` }>
							<img alt="logo" src={ logo } className="d-inline-block logo" /> <br /> test reports
						</Navbar.Brand>
						<Navbar.Toggle aria-controls="basic-navbar-nav" />
						<Navbar.Collapse id="basic-navbar-nav" className="justify-content-end">
							<Nav activeKey={ location.pathname } className="ml-auto">
								<Nav.Link href={ `${ basename }/#/` }>Summary</Nav.Link>
								{ reportRoutes.map(
									( route, index ) =>
										route.name && (
											<Nav.Link key={ index } href={ `${ basename }/#${ route.path }` }>
												{ route.name }
											</Nav.Link>
										)
								) }
								<Nav.Link href={ `${ basename }/#/flows` }>Flows</Nav.Link>
								<Nav.Link href={ `${ basename }/#/errors` }>Errors</Nav.Link>
							</Nav>
						</Navbar.Collapse>
					</Container>
				</Navbar>
				<HashRouter>
					<Routes>
						<Route exact path="/" element={ <Summary /> } />
						{ reportRoutes.map( ( route, index ) => (
							<Route
								exact
								path={ route.path }
								key={ index }
								element={ <Reports key={ index } event={ route.event } /> }
							/>
						) ) }
						<Route exact path="/flows" element={ <Flows /> } />
						<Route exact path="/errors" element={ <Errors /> } />
					</Routes>
				</HashRouter>
			</div>
			<footer className="App-footer">
				<div>
					<a
						target="_blank"
						href="https://github.com/woocommerce/woocommerce-test-reports/"
						rel="noreferrer"
					>
						Code
					</a>
					{ ' • ' }
					<a
						target="_blank"
						href="https://github.com/woocommerce/woocommerce-test-reports/actions"
						rel="noreferrer"
					>
						Actions
					</a>
				</div>
			</footer>
		</Container>
	);
}

export default App;
