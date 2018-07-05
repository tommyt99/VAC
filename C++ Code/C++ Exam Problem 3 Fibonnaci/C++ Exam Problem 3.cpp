#include <iostream>
#include <vector>
#include <cmath>
#include <array>
using namespace std;

int main() {
	vector <int> Fib;
	Fib.push_back(0);
	Fib.push_back(1); 
	Fib.push_back(0);

	for (int i = 2; i < 30; i++) {
		Fib[i] = Fib[i - 2] + Fib[i - 1];

	}
	
	for (int i = 0; i < 20; i++) {
		cout << Fib[i] << endl;
	}
	int o; 
	cin >> o;

	return 0;
}


//Justus's Code - he used iterators
#include <iostream>
#include <vector>
using namespace std;

vector <int> hold;
int fib(int n)
{
	hold.push_back(1);
	hold.push_back(1);

	int previous = 1;
	int current = 1;
	int next = 1;
	int count = 2;
	for (int i = 3; i <= n; ++i)
	{
		next = current + previous;
		previous = current;
		current = next;
		//cout << "next: " << count << " , pre " << previous << " curent, " << current << endl;
		hold.push_back(current);
		count++;
	}
	return next;
}
int main() {
	fib(22);

	vector<int>::iterator ptr;
	for (ptr = hold.begin(); ptr < hold.begin() + 20; ptr++)
	{
		cout << *ptr << ' ';
	}

	int a = 0;
	cin >> a;




}