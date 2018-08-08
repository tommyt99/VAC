#include <QCoreApplication>
#include <QVector>
#include <QDebug>
#include <iostream>


QVector<float> Thomas_Algorithm(QVector<float> &below_main_diagonal,
	QVector<float> &main_diagonal,
	QVector<float> &beyond_main_diagonal,
	QVector<float> &free_term,
	const  int N) {

	QVector<float> x; //vector of result

					  // checking of input data
	if (below_main_diagonal.size() != main_diagonal.size() ||
		main_diagonal.size() != beyond_main_diagonal.size() ||
		free_term.size() != main_diagonal.size())
	{
		qDebug() << "Error!\n"
			"Error with accepting Arrays! Dimensities are different!" << endl;
		x.resize(0);
		return x;
	}
	if (below_main_diagonal[0] != 0) {
		qDebug() << "Error!\n"
			"First element of below_main_diagonal must be equal to zero!" << endl;
		x.resize(0);
		return x;
	}
	if (beyond_main_diagonal.last() != 0) {
		qDebug() << "Error!\n"
			"Last element of beyond_main_diagonal must be equal to zero!" << endl;
		x.resize(0);
		return x;

	}
	// end of checking

	QVector <float> c;
	QVector <float> d;

	for (int i = 0; i<N; i++) {
		main_diagonal[i] *= (-1);
	}

	c.push_back(beyond_main_diagonal[0] / main_diagonal[0]);
	d.push_back(-free_term[0] / main_diagonal[0]);

	for (int i = 1; i <= N - 2; i++) {
		c.push_back(beyond_main_diagonal[i] / (main_diagonal[i] - below_main_diagonal[i] * c[i - 1]));
		d.push_back((below_main_diagonal[i] * d[i - 1] - free_term[i]) /
			(main_diagonal[i] - below_main_diagonal[i] * c[i - 1]));
	}

	x.resize(N);

	int n = N - 1;
	x[n] = (below_main_diagonal[n] * d[n - 1] - free_term[n]) / (main_diagonal[n] - below_main_diagonal[n] * c[n - 1]);

	for (int i = n - 1; i >= 0; i--) {
		x[i] = c[i] * x[i + 1] + d[i];
	}

	for (int i(0); i<N; ++i) {
		main_diagonal[i] *= (-1);
	}

	return x;
}

int main()
{
	QVector <float> alpha;  // below
	QVector <float> beta;   // main diagonal * (-1)
	QVector <float> gamma;  // beyond
	QVector <float> b;      // free term


	QVector<float> T;

	int cells_x = 30;         // amount of steps
	alpha.resize(cells_x);
	beta.resize(cells_x);
	gamma.resize(cells_x);
	T.resize(cells_x);

	float dt = 0.2, h = 0.1;

	alpha[0] = 0;
	for (int i = 1; i<cells_x - 1; i++) {
		alpha[i] = -dt / (h*h);
	}
	alpha[cells_x - 1] = 0;

	beta[0] = 1;
	for (int i = 1; i<cells_x - 1; i++) {
		beta[i] = (2 * dt) / (h*h) + 1;
	}
	beta[cells_x - 1] = 1;
	gamma[0] = 0;
	for (int i = 1; i<cells_x - 1; i++) {
		gamma[i] = -dt / (h*h);
	}
	gamma[cells_x - 1] = 0;

	for (int i = 0; i<cells_x - 1; i++) {
		T[i] = 0;
	}
	T[cells_x - 1] = 1;

	QVector<float>Tn;
	Tn.resize(cells_x);
	Tn = Thomas_Algorithm(alpha, beta, gamma, T, cells_x);
	// boundary conditions!
	beta.first() = 1;
	beta.last() = 1;
	gamma.first() = 0;
	alpha.last() = 0;
	// and then due to bc we always have T[0]=0 and T[n]=1

	for (int stepTime = 0; stepTime<100; stepTime++) {
		Tn = Thomas_Algorithm(alpha, beta, gamma, Tn, cells_x);

		qDebug() << "stepTime = " << stepTime << endl << endl;
		qDebug() << Tn << endl;

		// boundary conditions!
		beta.first() = 1;
		beta.last() = 1;
		gamma.first() = 0;
		alpha.last() = 0;
		// and then due to bc we always have T[0]=0 and T[n]=1
	}

	return 0;
}