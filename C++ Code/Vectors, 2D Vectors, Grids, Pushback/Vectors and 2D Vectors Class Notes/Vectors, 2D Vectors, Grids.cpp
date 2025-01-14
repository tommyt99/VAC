// VECTORS and creating vectors
#include <iostream>
#include <vector>
using namespace std;

//THIS IS IN THE NOTES

int main() {
	//vec with 10 elements, all of them the number 5
	vector<int> vect1(10, 5); //vector with 10 spaces and initialize with a value of 5
	cout << "Vector has " << vect1.size() << " elements. \n"; // this gets the size 

	for (long index = 0; index < (long)vect1.size(); ++index) // for index= 0:1:size_of_vector
		cout << "Element" << index << ": " << vect1.at(index) << endl;

	vect1.resize(7);

	cout << "vector has (line 17)" << vect1.size() << " elements. \n"

		for (long index = 0; index < (long)vect1.size(); ++index)
			cout << "Element << index << ": " << vect1.at(index) << endl; 

			return 0;
}




// PUSH_BACK
#include <iostream>
#include<vector>
using namespace std;

int main() {
	vector <int> example;

	example.push_back(3);
	example.push_back(33);
	example.push_back(1000);

	for (int x = 0; x < example.size(); ++x)
		cout << example[x] << " ";

	if (!example.empty()) example.clear();

	vector<int> another_vector;

	another_vector.push_back(10);
	example.push_back(10);

	cout << endl;
	for (int x = 0; x < another_vector.size(); ++x)
		cout << another_vector[x] << " ";


	return 0;
}




// CONCATENATION
#include <iostream>
#include <unordered_set>
#include <array>
#include <string> 

using namespace std;

int main() {
	unordered_set<string> myset = { "yellow", "green,", "blue" };
	array<string, 2>       myarray = { "black","white" }; //array of strings with 2 components
	string                mystring = "red";
	myset.insert(mystring);     //copy insertion 
	myset.insert(mystring + "dish"); //move insertion
	myset.insert(myarray.begin(), myarray.end()); //range insertion
	myset.insert({ "purple", "orange" });

	cout << "myset contains:" << endl;

	for (const string &x : myset) cout << "  " << x;
	cout << endl;


	return 0;
}


// This one is about making a grid and adding another element to a row 
// Ask about this one 
#include <iostream>
#include <vector> 
using namespace std;

int main() {

	int n;
	cout << "How big? ";
	cin >> n;
	//                            |-> no. of rows  |-> init value
	vector <vector<int> >  grid(3, vector<int>(4, n));   //each shelf, I'm going to have a vector 
														 //	                                           |-> no. of columns

	for (int row = 0; row <grid.size(); row++) {
		for (int col = 0; col<grid[row].size; col++) {
			cout << grid[row][col] << " " << flush;
		}
		cout << endl;
	}

	grid[1].push_back(11); // grid[1] is really row #2 

	for (int row = 0; row <grid.size(); row++) {
		for (int col = 0; col<grid[row].size(); col++) {
			cout << grid[row][col] << " " << flush;
		}
		cout << endl;
	}

	return 0;
}



// This one is about making a grid and adding another element to a row 
// Ask about this one 
#include <iostream>
#include <vector> 
using namespace std;

int main() {

	int n;
	cout << "How big? ";
	cin >> n;
	//                            |-> no. of rows  |-> init value
	vector <vector<int> >  grid(3, vector<int>(4, n));   //each shelf, I'm going to have a vector 
														 //	                                           |-> no. of columns

	for (int row = 0; row <grid.size(); row++) {
		for (int col = 0; col<grid[row].size; col++) {
			cout << grid[row][col] << " " << flush;
		}
		cout << endl;
	}

	grid[1].push_back(11); // grid[1] is really row #2 

	for (int row = 0; row <grid.size(); row++) {
		for (int col = 0; col<grid[row].size(); col++) {
			cout << grid[row][col] << " " << flush;
		}
		cout << endl;
	}

	return 0;
}


// ITERATORS

#include <iostream>
#include <list>
using namespace std;

int main() {

	list<int> numbers;

	numbers.push_back(1);
	numbers.push_back(2);
	numbers.push_back(3);

	numbers.push_front(0); //NEW

	cout << "\nBefore inserting: " << endl;


	//	                |-> this guy is a star
	for (list<int>::iterator it = numbers.begin(); it != numbers.end(); ++it)
		cout << *it << endl;

	// no more iterator because for loop ends



	list<int>::iterator it = numbers.begin(); // *it=0
	it++; //*it=1

	numbers.insert(it, 11223344);

	cout << "\nBefore inserting:" << endl;

	//	                |-> this guy is a star
	for (it = numbers.begin(); it != numbers.end(); ++it)
		cout << *it << endl;

	it = numbers.being(); //declared in line 22 
	it++;
	numbers.erase(it);



	// A N O T H E R   E X A M P L E 
	// 0 1 2 3 
	//                                                        N O T H I N G  H E R E
	//                                                                      V
	for (list<int>::iterator it = numbers.begin(); it != numbers.end(); ) {
		if (*it == 2) { numbers.insert(it, 22334455) }

		if (*it == 1) { it = numbers.erase(it); }  // takes out value but keeps address
		else { ++it; }
	}

	for (it = numbers.begin(); it != numbers.end(); ++it)
		cout << *it << endl;




	return 0;
}
