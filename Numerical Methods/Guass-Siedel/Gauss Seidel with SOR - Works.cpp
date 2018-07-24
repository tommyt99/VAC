// Gauss Seidel Method
// with Sucessive Over-Relaxation (SOR)
// Gauss Seidel updates the previous value with a newer, better value
// SOR uses a little bit of the previous value and adds it to the newer, better value 
#include <iostream>
#include <math.h>
using namespace std;

int main()
{
	const int n = 3;
	double a[n][n] = {
	{ 3,-.1,-.2 },
	{ .1, 7, -.3 },
	{ .3,-.2,10 } };
	double b[n] = { 7.85,-19.3,71.4 };
	double error = 1;
	double EPSILON = pow(10, -6);
	double x[3] = { 1,1,1 };
	double x_new[3] = { 0,0,0 };
	double lambda = 1.1; // Lambda between 1 and 2 
	int iteration = 0; 

	for (int i = 0; i<n; i++)
		for (int j = 0; j < n; j++) {
			cout << a[i][j] << " ";
			if (j == n - 1) {
				cout << endl;
			}
		}

	while (error / 3 > EPSILON)
	{
		iteration += 1; 
		error = 0;
		for (int i = 0; i < n; i++)
		{
			x_new[i] = 0;
			for (int j = 0; j < n; j++)
			{
				if (i != j)
				{
					x_new[i] += a[i][j] * x[j];
				}
			}
			//x_new[i] = ((b[i] - x_new[i]) / a[i][i]) (This is before adding SOR) 
			x_new[i] = ((b[i] - x_new[i]) / a[i][i]) * (lambda + (1 - lambda) * x[i]);
			error += abs(x_new[i] - x[i]);
			x[i] = x_new[i];

			
		}
	}



	for (int i = 0; i < n; i++)
	{
		cout << "x" << i + 1 << "= " << x[i] << endl;
	}

	cout << iteration << endl;

	system("PAUSE");
	return 0;
}


